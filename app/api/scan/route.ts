import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createHash } from 'crypto';
import { scanRateLimiter } from '../middleware';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Helper function to extract JS URLs from HTML
const extractJsUrls = (html: string, baseUrl: string): string[] => {
  const $ = cheerio.load(html);
  const jsUrls: string[] = [];
  
  $('script').each((_, element) => {
    const src = $(element).attr('src');
    if (src && !src.startsWith('data:') && !src.includes('analytics')) {
      if (src.startsWith('http')) {
        jsUrls.push(src);
      } else if (src.startsWith('/')) {
        const url = new URL(baseUrl);
        jsUrls.push(`${url.origin}${src}`);
      } else {
        const url = new URL(baseUrl);
        jsUrls.push(`${url.origin}/${src}`);
      }
    }
  });
  
  return jsUrls;
};

// Function to extract both linked and inline JS from HTML
const extractJsContent = (html: string, baseUrl: string): { urls: string[], inlineCode: string[] } => {
  const $ = cheerio.load(html, { decodeEntities: false });
  const jsUrls: string[] = [];
  const inlineCode: string[] = [];
  
  // Extract linked JS files
  $('script').each((_, element) => {
    const src = $(element).attr('src');
    if (src && !src.startsWith('data:')) {
      if (src.startsWith('http')) {
        jsUrls.push(src);
      } else if (src.startsWith('/')) {
        const url = new URL(baseUrl);
        jsUrls.push(`${url.origin}${src}`);
      } else {
        const url = new URL(baseUrl);
        jsUrls.push(`${url.origin}/${src}`);
      }
    } else {
      // Get inline script content
      const content = $(element).html();
      if (content && content.trim()) {
        inlineCode.push(content);
      }
    }
  });
  
  return { urls: jsUrls, inlineCode };
};

// Function to check for common API keys patterns
const checkForApiKeys = (content: string): Array<{type: string, preview: string, details: string}> => {
  const patterns = [
    // General API key patterns - more inclusive
    { name: 'API Key', regex: /['"]?(?:api[_-]?key|apikey|api_token|access[_-]?key|access[_-]?token)['"]?\s*[:=]\s*['"]([a-zA-Z0-9_\-\.]{10,})['"]/ },
    
    // Service-specific keys
    { name: 'AWS Key', regex: /['"]?(?:AKIA|ASIA)[A-Z0-9]{16}['"]?/ },
    { name: 'Azure Key', regex: /['"]?(?:key|primarykey|secondarykey|accountkey|accesskey)['"]?\s*[:=]\s*['"][a-zA-Z0-9+\/=]{44,}['"]|DefaultEndpointsProtocol=https;AccountName=[^;]+;AccountKey=[a-zA-Z0-9+\/=]{88}/i },
    { name: 'Firebase Key', regex: /['"]?AIza[0-9A-Za-z-_]{35}['"]?/ },
    { name: 'Google API', regex: /['"]?AIza[0-9A-Za-z-_]{35}['"]?/ },
    { name: 'Stripe Key', regex: /['"]?(?:sk_live_|pk_live_|rk_live_)[a-zA-Z0-9]{24,}['"]?/ },
    { name: 'Supabase Key', regex: /['"]?(?:eyJ|sbp_)[a-zA-Z0-9._-]{40,}['"]?/ },
    { name: 'GitHub Token', regex: /['"]?(?:ghp_|gho_|ghu_|ghs_|ghr_)[a-zA-Z0-9]{36,}['"]?/ },
    { name: 'Replicate Token', regex: /['"]?r8_[a-zA-Z0-9]{20,}['"]?/ },
    
    // Generic token patterns - catch more types
    { name: 'Authentication Token', regex: /['"]?(?:token|auth[_-]?token|secret|key|password|credential)['"]?\s*[:=]\s*['"]([a-zA-Z0-9_\-\.]{10,})['"]/ },
    
    // Bearer token usage in code
    { name: 'Bearer Token', regex: /[`'"]?bearer\s+([a-zA-Z0-9_\-\.]{10,})[`'"]?|authorization['"]?\s*[:=]\s*[`'"]bearer\s+([a-zA-Z0-9_\-\.]{10,})[`'"]|['"]\s*Authorization['"]\s*:\s*[`'"]\s*Bearer\s+[\$\{]?[a-zA-Z0-9_]+[\}]?[`'"]/i },
    
    // API key used in URL
    { name: 'API Key in URL', regex: /https?:\/\/[^"'\s]+[\?&](?:key|apikey|api_key|access_token|token)=([a-zA-Z0-9_\-\.]{10,})(?:['"&]|$)/ },
    
    // Firebase configuration - more specific pattern
    { name: 'Firebase Config', regex: /apiKey['"]?\s*[:=]\s*['"]([a-zA-Z0-9_\-\.]{10,})['"](?:(?:[\s\S](?!apiKey))*?authDomain|(?:[\s\S](?!apiKey))*?databaseURL|(?:[\s\S](?!apiKey))*?projectId)/i },
    
    // Keys in config objects - more generic pattern
    { name: 'Config with API Key', regex: /['"]?(?:config|options|settings|credentials)[\w\s]*?[=:][^=:]*?['"]?(?:key|token|secret|password|apiKey)['"]?\s*[:=]\s*['"]([a-zA-Z0-9_\-\.]{10,})['"]/ },
    
    // Keys exposed in console logs or debugging
    { name: 'API Key in Console Log', regex: /console\.log\(\s*[^)]*?(?:['"][^'"]*?['"][\s,+]*)?(?:['"]?api[_-]?key['"]?|['"]?apikey['"]?|['"]?token['"]?|['"]?secret['"]?)[^)]*?['"]([a-zA-Z0-9_\-\.]{10,})['"]/ },
    
    // Database configuration objects (catches Firebase configs)
    { name: 'Database Config', regex: /(?:db|database)(?:Config|Settings|Options).*?['"]?apiKey['"]?\s*[:=]\s*['"]([a-zA-Z0-9_\-\.]{10,})['"]/ },
    
    // More general object with apiKey property
    { name: 'Object with API Key', regex: /[^\w](?:const|let|var)\s+\w+\s*=\s*\{[\s\S]{0,100}?['"]?apiKey['"]?\s*[:=]\s*['"]([a-zA-Z0-9_\-\.]{10,})['"][\s\S]{0,500}?\}/ },
    
    // Private key material
    { name: 'Private Key', regex: /-----BEGIN\s+(?:PRIVATE|RSA PRIVATE|DSA PRIVATE|EC PRIVATE)\s+KEY-----/ },
    
    // JWT Tokens (common auth format)
    { name: 'JWT Token', regex: /['"]?eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.([a-zA-Z0-9_-]){10,}['"]?/ },
  ];
  
  // Patterns to ignore (common false positives)
  const ignorePatterns = [
    // Common minified code patterns
    /['"](configurable|enumerable|writable|constructor|prototype|function)['"]/i,
    // Variable name fragments that look like credentials
    /dby["']/i,
    // MD5 hashes (common in analytics)
    /['"]\b[a-f0-9]{32}\b['"]/i, 
    // UUIDs without hyphens
    /['"]\b[a-f0-9]{32}\b['"]/i,
    // Common analytics/metrics identifiers
    /['"][a-zA-Z0-9]{32}['"]\s*(?:as|in|for|from|on)\s/i,
    // Console logs that don't actually contain sensitive data
    /console\.log\("data-|console\.log\(t\)|console\.log\([^,)]{1,20}\)/i,
    // Common JavaScript object properties in minified code
    /['"]\w{1,10}['"]\s*[:=]\s*['"]\w{1,10}['"]/,
    // HTML element IDs and classes
    /getElementById\(['"][a-zA-Z0-9_-]+['"]\)|querySelector\(['"]#[a-zA-Z0-9_-]+['"]\)/,
    // Font codes (often look like API keys)
    /font-\w+:|fontFamily:/,
    // License headers in code
    /\* @license|\* Copyright/,
  ];
  
  // Keys that are intentionally public
  const publicKeysRegex = [
    // reCAPTCHA site keys (intentionally public)
    /sitekey['"]?\s*[:=]\s*['"](?:0x4A)?[a-zA-Z0-9_-]+['"]/i,
    /['"]?g-recaptcha-(?:response|token)['"]?/i,
    
    // Various public keys
    /publishable[-_]?key|public[-_]?key|site[-_]?key|client[-_]?id/i,
    /vapid[-_]?public[-_]?key/i,
    /gtag|google[-_]?tag|ga[-_]?id|tracking[-_]?id/i
  ];
  
  // Additional check for minified code
  const isLikelyMinified = (line: string): boolean => {
    // Check for signs of minification - long lines with few breaks or many adjacent symbols
    return line.length > 500 && (line.split(/\s+/).length < line.length / 20 || line.match(/[;{}():,]{10,}/));
  };
  
  const findings: Array<{type: string, preview: string, details: string}> = [];
  
  // Special handling for Firebase config objects
  const firebaseConfigPattern = /(?:const|let|var)\s+(\w+)\s*=\s*\{[\s\S]{0,50}?apiKey\s*:\s*["']([a-zA-Z0-9_\-\.]{10,})["'][\s\S]{0,200}?(?:authDomain|databaseURL|projectId)/g;

  // Replace matchAll with a more compatible approach using exec in a loop
  let firebaseMatches = [];
  if (typeof content === 'string') {
    let match;
    while ((match = firebaseConfigPattern.exec(content)) !== null) {
      firebaseMatches.push(match);
    }
  }

  for (const match of firebaseMatches) {
    const fullMatch = match[0];
    const variableName = match[1];
    const apiKey = match[2];
    
    // Find the line
    const lines = content.split('\n');
    let matchStart = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(variableName) && lines[i].includes('=') && 
         (lines[i].includes('{') || (i+1 < lines.length && lines[i+1].includes('apiKey')))) {
        matchStart = i;
        break;
      }
    }
    
    // Extract context (the entire config object)
    let contextLines = [];
    if (matchStart >= 0) {
      let openBraces = 0;
      let foundStart = false;
      for (let i = matchStart; i < Math.min(matchStart + 10, lines.length); i++) {
        const line = lines[i];
        contextLines.push(line);
        
        // Count braces to find the end of the object
        if (line.includes('{')) {
          foundStart = true;
          openBraces += (line.match(/\{/g) || []).length;
        }
        if (line.includes('}')) {
          openBraces -= (line.match(/\}/g) || []).length;
        }
        
        if (foundStart && openBraces <= 0) {
          break;
        }
      }
    }
    
    // Create context with proper redaction
    const context = contextLines.join('\n');
    const redactedContext = context.replace(/(['"])([a-zA-Z0-9_\-\.]{8})[\w\-\.]+?(['"])/g, "$1$2●●●●●●●●$3");
    
    findings.push({
      type: 'Firebase Configuration',
      preview: `${variableName} = { apiKey: "${apiKey.substring(0, 8)}..." }`,
      details: redactedContext
    });
  }
  
  // Continue with regular pattern matching
  patterns.forEach(pattern => {
    const regex = new RegExp(pattern.regex, 'g');
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      // Extract the matched string
      const matchedStr = match[0];
      
      // Find the line containing this match
      const lines = content.split('\n');
      let matchLine = '';
      let matchContext = '';
      
      for (const line of lines) {
        if (line.includes(matchedStr)) {
          matchLine = line.trim();
          
          // Skip if this appears to be minified code (unless it's a specific key format)
          if (isLikelyMinified(line) && 
              !['Firebase Key', 'AWS Key', 'Stripe Key', 'Supabase Key', 'GitHub Token', 'JWT Token', 'Replicate Token', 'Bearer Token'].some(s => pattern.name.includes(s))) {
            break;
          }
          
          // Get some context (30 chars before and after)
          const matchIndex = line.indexOf(matchedStr);
          const startIndex = Math.max(0, matchIndex - 30);
          const endIndex = Math.min(line.length, matchIndex + matchedStr.length + 30);
          matchContext = line.substring(startIndex, endIndex);
          break;
        }
      }
      
      // If no matching line was found, skip this match
      if (!matchLine) continue;
      
      // Check if the match is a known false positive pattern
      let isFalsePositive = false;
      
      for (const ip of ignorePatterns) {
        if (ip.test(matchLine)) {
          isFalsePositive = true;
          break;
        }
      }
      
      // Check specifically for public keys that should be ignored
      for (const publicKeyPattern of publicKeysRegex) {
        if (publicKeyPattern.test(matchLine)) {
          isFalsePositive = true;
          break;
        }
      }
      
      // Skip matches that contain the term "sitekey" or relate to reCAPTCHA
      if (matchLine.toLowerCase().includes('sitekey') || 
          matchLine.toLowerCase().includes('recaptcha') || 
          matchLine.toLowerCase().includes('captcha')) {
        isFalsePositive = true;
      }
      
      // Only add if it's not a false positive
      if (!isFalsePositive) {
        // Create a preview with hidden sensitive parts
        const previewMatch = matchedStr.replace(/(["'])([a-zA-Z0-9_\-\.]{8})[\w\-\.]{8,}(["'])/g, "$1$2...$3");
        // Create a details view with redacted sensitive parts
        const detailsMatch = matchedStr.replace(/(["'])([a-zA-Z0-9_\-\.]{8})[\w\-\.]+?(["'])/g, "$1$2●●●●●●●●$3");
        
        findings.push({
          type: pattern.name,
          preview: previewMatch.substring(0, 30) + (previewMatch.length > 30 ? '...' : ''),
          details: matchContext.replace(matchedStr, detailsMatch)
        });
      }
    }
  });
  
  // Add a specific check for Supabase URL and key pairs
  const findSupabaseCredentials = (content: string): {url: string, key: string} | null => {
    // Look for Supabase URL pattern (something.supabase.co)
    const urlMatch = content.match(/['"]https:\/\/([a-z0-9-]+)\.supabase\.co['"]/);
    if (!urlMatch) return null;
    
    // Look for anon key nearby (typically starts with eyJ or sbp_)
    const keyMatch = content.match(/['"](?:eyJ|sbp_)[a-zA-Z0-9._-]{40,}['"]/);
    if (!keyMatch) return null;
    
    return {
      url: urlMatch[0].replace(/['"]/g, ''),
      key: keyMatch[0].replace(/['"]/g, '')
    };
  };
  
  // Check for Supabase credentials and add to findings
  const supabaseCredentials = findSupabaseCredentials(content);
  if (supabaseCredentials) {
    findings.push({
      type: 'Supabase Credentials',
      preview: `URL: ${supabaseCredentials.url.substring(0, 15)}... Key: ${supabaseCredentials.key.substring(0, 8)}...`,
      details: `Found Supabase URL and anon key - will test RLS configuration`,
      supabaseCreds: supabaseCredentials
    });
  }
  
  return findings;
};

// Function to check security headers
const checkSecurityHeaders = (headers: Record<string, string>): {
  present: string[];
  missing: string[];
} => {
  const securityHeaders = [
    'content-security-policy',
    'x-frame-options',
    'x-content-type-options',
    'strict-transport-security',
    'x-xss-protection',
    'referrer-policy',
    'permissions-policy'
  ];
  
  const present: string[] = [];
  const missing: string[] = [];
  
  securityHeaders.forEach(header => {
    const key = Object.keys(headers).find(h => h.toLowerCase() === header);
    if (key) {
      present.push(header);
    } else {
      missing.push(header);
    }
  });
  
  return { present, missing };
};

// Calculate security score
const calculateScore = (
  headerPresent: number, 
  headerMissing: number, 
  leaks: number
): number => {
  // Base score is 100
  let score = 100;
  
  // Deduct points for missing headers (only up to 10 points total)
  const headerWeight = 10; // Reduced from 40 to 10
  const totalHeaders = headerPresent + headerMissing;
  const missingHeaderPenalty = totalHeaders > 0 
    ? (headerMissing / totalHeaders) * headerWeight
    : 0;
  
  // Deduct points for potential leaks (15 points each, up to 60 points)
  const leakPenalty = Math.min(leaks * 15, 60);
  
  score = Math.max(0, Math.floor(score - missingHeaderPenalty - leakPenalty));
  return score;
};

// Constants for rate limiting
const FREE_SCAN_LIMIT = 2;

// Function to identify auth pages and check for CAPTCHA presence
const checkAuthPagesForCaptcha = async (baseUrl: string, html: string): Promise<{
  authPagesFound: string[];
  captchaProtected: string[];
  unprotectedPages: string[];
}> => {
  const $ = cheerio.load(html);
  const authPagesFound: string[] = [];
  const captchaProtected: string[] = [];
  const unprotectedPages: string[] = [];
  
  // Find potential auth page links
  const authPageKeywords = ['login', 'signin', 'signup', 'register', 'auth', 'account/create'];
  
  // Search for links matching auth keywords
  $('a').each((_, element) => {
    const href = $(element).attr('href');
    const text = $(element).text().toLowerCase();
    
    if (!href) return;
    
    const isAuthLink = authPageKeywords.some(keyword => 
      href.toLowerCase().includes(keyword) || text.includes(keyword)
    );
    
    if (isAuthLink) {
      // Resolve relative URLs
      let fullUrl = href;
      if (href.startsWith('/')) {
        const url = new URL(baseUrl);
        fullUrl = `${url.origin}${href}`;
      } else if (!href.startsWith('http')) {
        const url = new URL(baseUrl);
        fullUrl = `${url.origin}/${href}`;
      }
      
      // Avoid duplicates
      if (!authPagesFound.includes(fullUrl)) {
        authPagesFound.push(fullUrl);
      }
    }
  });
  
  // Also check the current page for auth forms
  const hasAuthForm = $('form').filter((_, element) => {
    const action = $(element).attr('action') || '';
    const formHtml = $(element).html().toLowerCase();
    return action.includes('login') || action.includes('signin') || action.includes('signup') || 
           formHtml.includes('password') || formHtml.includes('login') || 
           formHtml.includes('signin') || formHtml.includes('signup');
  }).length > 0;
  
  if (hasAuthForm && !authPagesFound.includes(baseUrl)) {
    authPagesFound.push(baseUrl);
  }
  
  // Check each auth page for CAPTCHA
  for (const pageUrl of authPagesFound) {
    try {
      const response = await axios.get(pageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 SecureViber Security Scanner'
        }
      });
      
      const pageHtml = response.data;
      const $page = cheerio.load(pageHtml);
      
      // Check for Google reCAPTCHA
      const hasRecaptcha = $page('div.g-recaptcha').length > 0 || 
                           pageHtml.includes('grecaptcha') || 
                           pageHtml.includes('google.com/recaptcha');
                           
      // Check for Cloudflare Turnstile
      const hasTurnstile = $page('div.cf-turnstile').length > 0 || 
                           pageHtml.includes('turnstile.js') || 
                           pageHtml.includes('challenges.cloudflare.com');
      
      if (hasRecaptcha || hasTurnstile) {
        captchaProtected.push(pageUrl);
      } else {
        unprotectedPages.push(pageUrl);
      }
    } catch (error) {
      console.error(`Failed to check auth page: ${pageUrl}`, error);
      // Still count this as an auth page, but can't determine protection
      unprotectedPages.push(pageUrl);
    }
  }
  
  return {
    authPagesFound,
    captchaProtected,
    unprotectedPages
  };
};

export async function POST(request: Request) {
  try {
    // Get the request body
    const body = await request.json();
    const { url } = body;
    
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }
    
    // Check if the domain exists before proceeding with full scan
    try {
      await axios.head(url, { 
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
    } catch (error: any) {
      // Handle DNS lookup failures specifically
      if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN' || 
          (error.message && (error.message.includes('getaddrinfo') || 
                          error.message.includes('ENOTFOUND')))) {
        return NextResponse.json({ 
          error: "domain_not_found", 
          message: "This website doesn't seem to exist. Please check the URL and try again." 
        }, { status: 404 });
      }
      
      // If it's another error but we can still proceed with the scan
      console.log("Initial HEAD request failed, but continuing with full scan:", error.message);
      // Continue with the scan, the domain might block HEAD requests
    }
    
    // Use the server-side client for auth context
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Get the user session correctly
    const { data: { session } } = await supabase.auth.getSession();
    
    // Extract IP address for anonymous users
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    
    // Check if user has unlimited scans (paid plan)
    let isUnlimitedUser = false;
    
    if (session?.user) {
      // Fetch profile using the same server-side client instance
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_plan')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        // Decide how to handle profile fetch error - maybe allow scan or return error?
        // For now, let's assume they are not unlimited if profile fails
      } else if (profile && profile.subscription_plan !== 'free') {
        // Correctly identify users with non-free plans
        isUnlimitedUser = true;
        console.log(`User ${session.user.id} identified as unlimited.`);
      } else {
        console.log(`User ${session.user.id} identified as free or profile issue.`);
      }
    } else {
      console.log("No active session found for rate limiting check.");
    }
    
    // Apply rate limiting for non-unlimited users
    if (!isUnlimitedUser) {
      console.log(`Applying rate limit check for identifier: ${session?.user?.id || ip}`);
      // Check and update scan usage
      const result = await checkAndUpdateScanUsage(ip, session?.user?.id);
      
      if (result.limitExceeded) {
        console.log(`Rate limit exceeded for identifier: ${session?.user?.id || ip}`);
        return NextResponse.json({
          error: "no_scans_remaining",
          message: "You've reached your scan limit. Please upgrade your plan for more scans.",
          redirectTo: "/signup"
        }, { status: 429 });
      }
    } else {
      console.log(`Skipping rate limit check for unlimited user: ${session?.user?.id}`);
    }
    
    // Continue with the actual scan logic
    // Fetch the website content
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 SecureViber Security Scanner'
        }
      });
      
      const html = response.data;
      
      // Check security headers
      const headerCheck = {
        present: [],
        missing: []
      };
      
      const importantHeaders = [
        'content-security-policy',
        'strict-transport-security',
        'x-frame-options',
        'x-content-type-options',
        'x-xss-protection',
        'referrer-policy',
        'permissions-policy'
      ];
      
      for (const header of importantHeaders) {
        if (response.headers[header]) {
          headerCheck.present.push(header);
        } else {
          headerCheck.missing.push(header);
        }
      }
      
      // Look for security leaks in HTML itself
      const htmlLeaks = checkForApiKeys(html);
      
      // Extract JS from the page (both inline and external)
      const jsContent = extractJsContent(html, url);
      
      // Check inline scripts for leaks
      let jsLeaks: Array<{type: string, preview: string, details: string}> = [];
      jsContent.inlineCode.forEach(code => {
        jsLeaks = [...jsLeaks, ...checkForApiKeys(code)];
      });
      
      // Fetch and check external JS files
      const jsFilesToCheck = jsContent.urls;
      for (const jsUrl of jsFilesToCheck) {
        try {
          const jsResponse = await axios.get(jsUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 SecureViber Security Scanner'
            }
          });
          const jsCode = jsResponse.data;
          jsLeaks = [...jsLeaks, ...checkForApiKeys(jsCode)];
        } catch (error) {
          // Skip files that can't be accessed
          console.error(`Failed to fetch JS file: ${jsUrl}`);
        }
      }
      
      // Consolidate all findings and deduplicate
      const allLeaks = [...htmlLeaks, ...jsLeaks];
      // Deduplicate by preview text
      const uniqueLeaks = allLeaks.filter((leak, index, self) => 
        index === self.findIndex(l => l.preview === leak.preview)
      );
      
      // Check for Supabase credentials and test RLS if found
      let rlsVulnerability = null;
      for (const leak of uniqueLeaks) {
        if (leak.type === 'Supabase Credentials' && leak.supabaseCreds) {
          try {
            // Call the RLS testing endpoint
            const rlsTestResponse = await axios.post(`${request.nextUrl.origin}/api/testRLS`, {
              supabaseUrl: leak.supabaseCreds.url,
              supabaseKey: leak.supabaseCreds.key
            });
            
            rlsVulnerability = rlsTestResponse.data;
            
            // Adjust the leak details to include RLS findings
            leak.details += rlsVulnerability.isRlsVulnerable 
              ? ` - CRITICAL: RLS appears to be misconfigured, found ${rlsVulnerability.vulnerableTables.length} accessible tables!` 
              : ' - RLS appears to be configured correctly';
          } catch (error) {
            console.error('Error testing RLS:', error);
          }
          break; // Only test the first set of credentials we find
        }
      }
      
      // Check for auth pages without CAPTCHA
      const authPageCheck = await checkAuthPagesForCaptcha(url, html);
      
      // Add unprotected auth pages to the leaks list
      if (authPageCheck.unprotectedPages.length > 0) {
        // Create a leak entry for each unprotected auth page
        for (const unprotectedPage of authPageCheck.unprotectedPages) {
          uniqueLeaks.push({
            type: 'Unprotected Auth Page',
            preview: `Auth page without CAPTCHA: ${unprotectedPage.substring(0, 30)}...`,
            details: `Authentication page found at ${unprotectedPage} does not appear to have CAPTCHA or Turnstile protection, making it vulnerable to credential stuffing and brute force attacks.`
          });
        }
      }
      
      // Calculate score
      let score = 100;
      
      // Deduct points for missing security headers (maximum 10 points)
      const headerPenalty = headerCheck.missing.length > 0
        ? Math.min(10, Math.floor((headerCheck.missing.length / (headerCheck.present.length + headerCheck.missing.length)) * 10))
        : 0;
      score -= headerPenalty;
      
      // Categorize leaks by severity and deduct points accordingly
      let criticalLeaksCount = 0;
      let highRiskLeaksCount = 0;
      let mediumRiskLeaksCount = 0;
      let lowRiskLeaksCount = 0;
      
      // Count leaks by severity
      uniqueLeaks.forEach(leak => {
        // Skip Supabase leaks if RLS is properly configured
        if (leak.type.includes('Supabase') && rlsVulnerability && !rlsVulnerability.isRlsVulnerable) {
          return;
        }
        
        // Determine severity based on type or explicit severity
        if (leak.type.includes('API Key') && !leak.type.toLowerCase().includes('captcha')) {
          criticalLeaksCount++;
        } else if (leak.type.includes('Supabase') && rlsVulnerability && rlsVulnerability.isRlsVulnerable) {
          highRiskLeaksCount++;
        } else if (leak.type.includes('Unprotected Auth Page')) {
          mediumRiskLeaksCount++;
        } else if (leak.type.toLowerCase().includes('captcha')) {
          lowRiskLeaksCount++;
        } else {
          mediumRiskLeaksCount++; // Default to medium risk
        }
      });
      
      // Deduct points based on risk levels
      score -= criticalLeaksCount * 20; // Critical: 20 points each
      score -= highRiskLeaksCount * 15;  // High: 15 points each
      score -= mediumRiskLeaksCount * 10; // Medium: 10 points each
      score -= lowRiskLeaksCount * 5;    // Low: 5 points each
      
      // Deduct more points if RLS is vulnerable (very critical)
      if (rlsVulnerability && rlsVulnerability.isRlsVulnerable) {
        score -= 25; // Significant penalty for RLS vulnerability
      }
      
      // Ensure score stays between 0-100
      score = Math.max(0, Math.min(100, score));
      
      // Return results with RLS information
      const scanResult = {
        url,
        headers: {
          present: headerCheck.present,
          missing: headerCheck.missing
        },
        leaks: uniqueLeaks.map(leak => {
          // Assign severity level to each leak
          let severity: 'critical' | 'high' | 'medium' | 'low' | 'secure' = 'medium';
          
          // Skip Supabase leaks if RLS is properly configured
          if (leak.type.includes('Supabase')) {
            severity = rlsVulnerability && rlsVulnerability.isRlsVulnerable ? 'high' : 'secure';
          }
          // API keys (except CAPTCHA keys) are critical
          else if (leak.type.includes('API Key') && !leak.type.toLowerCase().includes('captcha')) {
            severity = 'critical';
          }
          // Auth pages without protection are medium risk
          else if (leak.type.includes('Unprotected Auth Page')) {
            severity = 'medium';
          }
          // CAPTCHA related issues are low risk
          else if (leak.type.toLowerCase().includes('captcha')) {
            severity = 'low';
          }
          
          return { ...leak, severity };
        }),
        jsFilesScanned: jsFilesToCheck.length,
        rlsVulnerability,
        authPages: {
          found: authPageCheck.authPagesFound,
          protected: authPageCheck.captchaProtected,
          unprotected: authPageCheck.unprotectedPages
        },
        score
      };
      
      return NextResponse.json(scanResult);
    } catch (error: any) {
      console.error("Error scanning website:", error.message);
      
      // Check if this is a website blocking our scan
      if (error.response) {
        const status = error.response.status;
        
        // 403 Forbidden, 429 Too Many Requests, 401 Unauthorized, 500 in some cases - all could indicate blocking
        if (status === 403 || status === 429 || status === 401) {
          return NextResponse.json({
            error: "blocked_by_website",
            message: "This website has advanced security measures that prevent automated scanning.",
            status: status
          }, { status: 200 }); // Return 200 status but with error info
        }
      }
      
      // Handle other errors
      return NextResponse.json({
        error: "scan_failed",
        message: error.message
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in scan endpoint:', error);
    return NextResponse.json({ 
      error: "scan_failed", 
      message: error instanceof Error ? error.message : "An unknown error occurred" 
    }, { status: 500 });
  }
}

// Helper function to check and update scan usage
async function checkAndUpdateScanUsage(ip: string, userId?: string) {
  try {
    // Create an admin Supabase client to bypass RLS policies
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
    
    // Create a unique identifier (user ID or hashed IP)
    const identifier = userId || hashIpAddress(ip);
    const type = userId ? 'authenticated' : 'anonymous';
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Check current usage
    const { data, error } = await supabase
      .from('scan_usage')
      .select('count')
      .eq('identifier', identifier)
      .eq('date', today)
      .maybeSingle();
    
    if (error) {
      console.error('Error checking scan usage:', error);
      return { limitExceeded: false }; // Let them scan if we can't check
    }
    
    const currentCount = data?.count || 0;
    
    // Check if limit exceeded
    if (currentCount >= FREE_SCAN_LIMIT) {
      return { limitExceeded: true };
    }
    
    // Update usage count - properly handle the upsert with onConflict
    const { error: updateError } = await supabase
      .from('scan_usage')
      .upsert(
        {
          identifier,
          type,
          date: today,
          count: currentCount + 1,
          last_scan: new Date().toISOString()
        },
        {
          onConflict: 'identifier,date',
          update: { 
            count: currentCount + 1,
            last_scan: new Date().toISOString()
          }
        }
      );
    
    if (updateError) {
      console.error('Error updating scan usage:', updateError);
    }
    
    console.log(`Scan count updated for ${identifier}: ${currentCount + 1}/${FREE_SCAN_LIMIT}`);
    return { limitExceeded: false };
  } catch (error) {
    console.error('Unexpected error in scan rate limiting:', error);
    return { limitExceeded: false }; // Let them scan if there's an error
  }
}

// Helper to hash IP addresses for privacy
function hashIpAddress(ip: string): string {
  return createHash('sha256').update(ip + process.env.IP_SALT || 'secure-viber-salt').digest('hex');
} 