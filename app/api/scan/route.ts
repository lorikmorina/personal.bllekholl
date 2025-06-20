import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createHash } from 'crypto';
import { scanRateLimiter } from '../middleware';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import dns from 'dns';
import { promisify } from 'util';

const dnsLookup = promisify(dns.lookup);

// Helper function to extract JS URLs from HTML
const extractJsUrls = (html: string, baseUrl: string): string[] => {
  const $ = cheerio.load(html);
  const jsUrls: string[] = [];
  
  $('script[src]').each((_, element) => {
    const src = $(element).attr('src');
    if (src) {
      if (src.startsWith('http')) {
        jsUrls.push(src);
      } else if (src.startsWith('//')) {
        jsUrls.push(`https:${src}`);
      } else if (src.startsWith('/')) {
        jsUrls.push(`${baseUrl}${src}`);
      } else {
        jsUrls.push(`${baseUrl}/${src}`);
      }
    }
  });
  
  return jsUrls;
};

// Function to extract both linked and inline JS from HTML
const extractJsContent = (html: string, baseUrl: string): { urls: string[], inlineCode: string[] } => {
  const $ = cheerio.load(html);
  const jsUrls: string[] = [];
  const inlineCode: string[] = [];
  
  // Extract linked JS files
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

interface SupabaseCredentials {
  url: string;
  key: string;
}

interface LeakWithSupabase {
  type: string;
  preview: string;
  details: string;
  severity?: 'critical' | 'warning' | 'info' | 'secure';
  supabaseCreds?: SupabaseCredentials;
}

// Function to check for API keys and sensitive information
const checkForApiKeys = (content: string): Array<LeakWithSupabase> => {
  const patterns = [
    // General API key patterns - more inclusive
    { name: 'API Key', regex: /['"]?(?:api[_-]?key|apikey|api_token|access[_-]?key|access[_-]?token)['"]?\s*[:=]\s*['"]([a-zA-Z0-9_\-\.]{10,})['"]/, severity: 'critical' },
    
    // Service-specific keys
    { name: 'AWS Key', regex: /['"]?(?:AKIA|ASIA)[A-Z0-9]{16}['"]?/, severity: 'critical' },
    { name: 'Azure Key', regex: /['"]?(?:key|primarykey|secondarykey|accountkey|accesskey)['"]?\s*[:=]\s*['"][a-zA-Z0-9+\/=]{44,}['"]|DefaultEndpointsProtocol=https;AccountName=[^;]+;AccountKey=[a-zA-Z0-9+\/=]{88}/i, severity: 'critical' },
    { name: 'Firebase Key', regex: /['"]?AIza[0-9A-Za-z-_]{35}['"]?/, severity: 'warning' },
    { name: 'Google API', regex: /['"]?AIza[0-9A-Za-z-_]{35}['"]?/, severity: 'warning' },
    { name: 'Stripe Key', regex: /['"]?(?:sk_live_|pk_live_|rk_live_)[a-zA-Z0-9]{24,}['"]?/, severity: 'critical' },
    { name: 'Supabase Key', regex: /['"]?(?:eyJ|sbp_)[a-zA-Z0-9._-]{40,}['"]?/, severity: 'warning' },
    { name: 'GitHub Token', regex: /['"]?(?:ghp_|gho_|ghu_|ghs_|ghr_)[a-zA-Z0-9]{36,}['"]?/, severity: 'critical' },
    { name: 'Replicate Token', regex: /['"]?r8_[a-zA-Z0-9]{20,}['"]?/, severity: 'warning' },
    
    // Generic token patterns - catch more types
    { name: 'Authentication Token', regex: /['"]?(?:token|auth[_-]?token|secret|key|password|credential)['"]?\s*[:=]\s*['"]([a-zA-Z0-9_\-\.]{10,})['"]/, severity: 'warning' },
    
    // Bearer token usage in code
    { name: 'Bearer Token', regex: /[`'"]?bearer\s+([a-zA-Z0-9_\-\.]{10,})[`'"]?|authorization['"]?\s*[:=]\s*[`'"]bearer\s+([a-zA-Z0-9_\-\.]{10,})[`'"]|['"]\s*Authorization['"]\s*:\s*[`'"]\s*Bearer\s+[\$\{]?[a-zA-Z0-9_]+[\}]?[`'"]/i, severity: 'warning' },
    
    // API key used in URL
    { name: 'API Key in URL', regex: /https?:\/\/[^"'\s]+[\?&](?:key|apikey|api_key|access_token|token)=([a-zA-Z0-9_\-\.]{10,})(?:['"&]|$)/, severity: 'critical' },
    
    // Firebase configuration - more specific pattern
    { name: 'Firebase Config', regex: /apiKey['"]?\s*[:=]\s*['"]([a-zA-Z0-9_\-\.]{10,})['"](?:(?:[\s\S](?!apiKey))*?authDomain|(?:[\s\S](?!apiKey))*?databaseURL|(?:[\s\S](?!apiKey))*?projectId)/i, severity: 'warning' },
    
    // Keys in config objects - more generic pattern
    { name: 'Config with API Key', regex: /['"]?(?:config|options|settings|credentials)[\w\s]*?[=:][^=:]*?['"]?(?:key|token|secret|password|apiKey)['"]?\s*[:=]\s*['"]([a-zA-Z0-9_\-\.]{10,})['"]/, severity: 'warning' },
    
    // Keys exposed in console logs or debugging
    { name: 'API Key in Console Log', regex: /console\.log\(\s*[^)]*?(?:['"][^'"]*?['"][\s,+]*)?(?:['"]?api[_-]?key['"]?|['"]?apikey['"]?|['"]?token['"]?|['"]?secret['"]?)[^)]*?['"]([a-zA-Z0-9_\-\.]{10,})['"]/, severity: 'warning' },
    
    // Database configuration objects (catches Firebase configs)
    { name: 'Database Config', regex: /(?:db|database)(?:Config|Settings|Options).*?['"]?apiKey['"]?\s*[:=]\s*['"]([a-zA-Z0-9_\-\.]{10,})['"]/, severity: 'warning' },
    
    // More general object with apiKey property
    { name: 'Object with API Key', regex: /[^\w](?:const|let|var)\s+\w+\s*=\s*\{[\s\S]{0,100}?['"]?apiKey['"]?\s*[:=]\s*['"]([a-zA-Z0-9_\-\.]{10,})['"][\s\S]{0,500}?\}/, severity: 'warning' },
    
    // Private key material
    { name: 'Private Key', regex: /-----BEGIN\s+(?:PRIVATE|RSA PRIVATE|DSA PRIVATE|EC PRIVATE)\s+KEY-----/, severity: 'critical' },
    
    // JWT Tokens (common auth format)
    { name: 'JWT Token', regex: /['"]?eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.([a-zA-Z0-9_-]){10,}['"]?/, severity: 'warning' },
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
    const hasManySeparators = /[;{}():,]{10,}/.test(line);
    return line.length > 500 && (line.split(/\s+/).length < line.length / 20 || hasManySeparators);
  };
  
  const findings: Array<LeakWithSupabase> = [];
  
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
      details: redactedContext,
      severity: 'warning'
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
          details: matchContext.replace(matchedStr, detailsMatch),
          severity: pattern.severity as 'critical' | 'warning' | 'info' | 'secure'
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
      severity: 'warning',
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
  const importantHeaders = [
    'strict-transport-security',
    'content-security-policy',
    'x-frame-options',
    'x-content-type-options',
    'referrer-policy',
    'permissions-policy'
  ];
  
  const present: string[] = [];
  const missing: string[] = [];
  
  for (const header of importantHeaders) {
    if (headers[header.toLowerCase()]) {
      present.push(header);
    } else {
      missing.push(header);
    }
  }
  
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
  
  // Find potential auth-related links
  const potentialAuthUrls = [
    '/login', '/signin', '/signup', '/register',
    '/auth/login', '/auth/signin', '/auth/signup', '/auth/register'
  ];

  // Check links in the HTML
  $('a[href]').each((_, element) => {
    const href = $(element).attr('href') || '';
    if (href.includes('login') || href.includes('signin') || href.includes('signup') || href.includes('register')) {
      const fullUrl = href.startsWith('http') ? href : `${baseUrl}${href.startsWith('/') ? '' : '/'}${href}`;
        authPagesFound.push(fullUrl);
    }
  });
  
  // Check for forms that might be auth forms
  const hasAuthForm = $('form').filter((_, element) => {
    const action = $(element).attr('action') || '';
    const formHtml = $(element).html();
    if (!formHtml) return false;
    const formHtmlLower = formHtml.toLowerCase();
    return action.includes('login') || action.includes('signin') || action.includes('signup') || 
           formHtmlLower.includes('password') || formHtmlLower.includes('login') || 
           formHtmlLower.includes('signin') || formHtmlLower.includes('signup');
  }).length > 0;
  
  if (hasAuthForm) {
    authPagesFound.push(`${baseUrl} (form detected)`);
  }

  // Add common auth URLs to check
  potentialAuthUrls.forEach(url => {
    const fullUrl = `${baseUrl}${url}`;
    if (!authPagesFound.some(existing => existing.includes(url))) {
      authPagesFound.push(fullUrl);
    }
  });
  
  // Check each auth page for CAPTCHA
  for (const authUrl of authPagesFound) {
    try {
      const response = await axios.get(authUrl, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      const pageHtml = response.data;
      const hasCaptcha = pageHtml.toLowerCase().includes('recaptcha') || 
                        pageHtml.toLowerCase().includes('captcha') ||
                        pageHtml.toLowerCase().includes('hcaptcha') ||
                        pageHtml.toLowerCase().includes('turnstile');

      if (hasCaptcha) {
        captchaProtected.push(authUrl);
      } else {
        unprotectedPages.push(authUrl);
      }
    } catch (error) {
      // If we can't access the page, we can't determine CAPTCHA status
      // Don't add to either list
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
    const { url, deepScanRequest, deep_scan_request_id } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL format
    let targetUrl = url;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = `https://${targetUrl}`;
    }

    try {
      new URL(targetUrl);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Check if the domain exists before proceeding with full scan
    try {
      await axios.head(targetUrl, { 
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

    const supabase = createRouteHandlerClient({ cookies: () => cookies() });
    let bypassPremiumCheck = false;

    // Secure deep scan verification
    if (deepScanRequest && deep_scan_request_id) {
      // Verify the deep scan request exists and is paid for
      const { data: deepScanData, error: deepScanError } = await supabase
        .from('deep_scan_requests')
        .select('id, payment_status, status')
        .eq('id', deep_scan_request_id)
        .eq('payment_status', 'completed')
        .single();

      if (deepScanError || !deepScanData) {
        return NextResponse.json({ 
          error: 'Invalid or unpaid deep scan request',
          details: 'Deep scan request not found or payment not completed'
        }, { status: 403 });
      }

      // Verified paid deep scan request - bypass premium check
      bypassPremiumCheck = true;
    }

    // Authentication and subscription checks (skip if verified deep scan)
    if (!bypassPremiumCheck) {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Require authentication for scanning
      if (!session?.user) {
        return NextResponse.json({
          error: "unauthorized",
          message: "Authentication required to scan websites",
          redirectTo: "/signup"
        }, { status: 401 });
      }

      // Fetch user profile to check subscription
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_plan')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        return NextResponse.json({
          error: "profile_error",
          message: "Error checking subscription status",
        }, { status: 500 });
      }
      
      // Check if user has an active subscription (non-free plan)
      if (!profile || profile.subscription_plan === 'free') {
        return NextResponse.json({
          error: "subscription_required",
          message: "A paid subscription is required to perform scans",
          redirectTo: "/pricing"
        }, { status: 403 });
      }
    }

    // Proceed with the scan
    const response = await axios.get(targetUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 SecureViber Security Scanner'
      }
    });
    
    const html = response.data;
    
    // Check security headers
    const responseHeaders = response.headers;
    
    // Convert axios headers to Record<string, string> format
    const normalizedHeaders: Record<string, string> = {};
    Object.entries(responseHeaders).forEach(([key, value]) => {
      if (typeof value === 'string') {
        normalizedHeaders[key.toLowerCase()] = value;
      } else if (Array.isArray(value)) {
        normalizedHeaders[key.toLowerCase()] = value.join(', ');
      } else if (value !== undefined) {
        normalizedHeaders[key.toLowerCase()] = String(value);
      }
    });
    
    const headerCheck = checkSecurityHeaders(normalizedHeaders);
    
    // Look for security leaks in HTML itself
    const htmlLeaks = checkForApiKeys(html);
    
    // Extract JS from the page (both inline and external)
    const jsContent = extractJsContent(html, targetUrl);
    
    // Check inline scripts for leaks
    let jsLeaks: Array<LeakWithSupabase> = [];
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

    // Check auth pages for CAPTCHA protection
    const authAnalysis = await checkAuthPagesForCaptcha(targetUrl, html);
    
    // Add unprotected auth pages to the leaks list
    if (authAnalysis.unprotectedPages.length > 0) {
      // Create a leak entry for each unprotected auth page
      for (const unprotectedPage of authAnalysis.unprotectedPages) {
        uniqueLeaks.push({
          type: 'Unprotected Auth Page',
          preview: `Auth page without CAPTCHA: ${unprotectedPage.substring(0, 30)}...`,
          details: `Authentication page found at ${unprotectedPage} does not appear to have CAPTCHA or Turnstile protection, making it vulnerable to credential stuffing and brute force attacks.`,
          severity: 'info'
        });
      }
    }

    // Test Supabase RLS if credentials were found
    let rlsVulnerability = null;
    for (const leak of uniqueLeaks) {
      if (leak.type === 'Supabase Credentials' && leak.supabaseCreds) {
        try {
          // Call the RLS testing endpoint
          const rlsTestResponse = await fetch(`${new URL(request.url).origin}/api/testRLS`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              supabaseUrl: leak.supabaseCreds.url,
              supabaseKey: leak.supabaseCreds.key
            })
          });
          
          if (rlsTestResponse.ok) {
            rlsVulnerability = await rlsTestResponse.json();
            
            // Adjust the leak severity and details based on RLS findings
            if (rlsVulnerability.isRlsVulnerable) {
              leak.severity = 'critical';
              leak.details += ` - CRITICAL: RLS appears to be misconfigured, found ${rlsVulnerability.vulnerableTables.length} accessible tables!`;
            } else {
              leak.severity = 'secure';
              leak.details += ' - RLS appears to be properly configured, no tables are publicly accessible';
            }
          }
        } catch (error) {
          console.error('Error testing RLS:', error);
        }
        break; // Only test the first Supabase instance found
      }
    }

    // Calculate security score (exclude properly secured Supabase instances from penalty)
    const secureSupabaseLeaks = uniqueLeaks.filter(leak => 
      leak.type === 'Supabase Credentials' && leak.severity === 'secure'
    ).length;
    const penalizableLeaks = uniqueLeaks.length - secureSupabaseLeaks;
    const score = calculateScore(headerCheck.present.length, headerCheck.missing.length, penalizableLeaks);

    return NextResponse.json({
      url: targetUrl,
      score,
      headers: {
        present: headerCheck.present,
        missing: headerCheck.missing
      },
      leaks: uniqueLeaks.map(leak => ({
        type: leak.type,
        preview: leak.preview,
        details: leak.details,
        severity: leak.severity || 'info'
      })),
      jsFilesScanned: jsFilesToCheck.length,
      rlsVulnerability,
      authPages: {
        found: authAnalysis.authPagesFound,
        protected: authAnalysis.captchaProtected,
        unprotected: authAnalysis.unprotectedPages
      },
      is_blocked: false,
      status: 200,
      scan_message: null
    });

  } catch (error: any) {
    console.error('Scan error:', error);
    
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
    
    if (error.code === 'ENOTFOUND' || error.message?.includes('getaddrinfo')) {
      return NextResponse.json({
        error: 'domain_not_found',
        message: 'Website not found. Please check the URL and try again.'
      }, { status: 404 });
    }
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
      return NextResponse.json({
        error: 'connection_refused',
        message: 'Unable to connect to the website. It may be down or blocking requests.'
      }, { status: 503 });
    }
    
    return NextResponse.json({ 
      error: 'scan_failed',
      message: error.message || 'An unexpected error occurred while scanning the website.'
    }, { status: 500 });
  }
} 