import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { scanRateLimiter } from '../middleware';

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
  const firebaseMatches = content.matchAll(firebaseConfigPattern);
  for (const match of Array.from(firebaseMatches)) {
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
  
  // Deduct points for missing headers (up to 40 points)
  const headerWeight = 40;
  const totalHeaders = headerPresent + headerMissing;
  const missingHeaderPenalty = (headerMissing / totalHeaders) * headerWeight;
  
  // Deduct points for potential leaks (15 points each, up to 60 points)
  const leakPenalty = Math.min(leaks * 15, 60);
  
  score = Math.max(0, Math.floor(score - missingHeaderPenalty - leakPenalty));
  return score;
};

export async function POST(request: Request) {
  // Get the user session first
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  // If user is authenticated, check their subscription plan
  let isUnlimitedUser = false;
  
  if (session?.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_plan')
      .eq('id', session.user.id)
      .single();
      
    // Users with any plan other than 'free' have unlimited scans
    if (profile && profile.subscription_plan !== 'free') {
      isUnlimitedUser = true;
    }
  }
  
  // Only apply rate limiting for unauthenticated users or free plan users
  if (!isUnlimitedUser) {
    const rateLimitResponse = await scanRateLimiter(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
  }
  
  try {
    const body = await request.json();
    const { url } = body;
    
    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }
    
    // Fetch the website content
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
    
    // Calculate score
    let score = 100;
    
    // Deduct points for missing security headers
    score -= headerCheck.missing.length * 5;
    
    // Deduct points for leaked API keys (more severe)
    score -= uniqueLeaks.length * 15;
    
    // Ensure score stays between 0-100
    score = Math.max(0, Math.min(100, score));
    
    // Return results
    return NextResponse.json({
      url,
      headers: {
        present: headerCheck.present,
        missing: headerCheck.missing
      },
      leaks: uniqueLeaks,
      jsFilesScanned: jsFilesToCheck.length,
      score
    });
    
  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json(
      { error: 'scan_failed', message: 'Failed to scan the website' },
      { status: 500 }
    );
  }
} 