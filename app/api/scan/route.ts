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
  
  // Extract inline scripts
  $('script:not([src])').each((_, element) => {
    const scriptContent = $(element).html();
    if (scriptContent && scriptContent.trim()) {
      inlineCode.push(scriptContent);
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
  supabaseCreds?: SupabaseCredentials;
}

// Function to check for API keys and sensitive information
const checkForApiKeys = (content: string): Array<LeakWithSupabase> => {
  const patterns = [
    { type: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/, severity: 'high' },
    { type: 'AWS Secret Key', regex: /aws_secret_access_key.*[=:]\s*["\']?([A-Za-z0-9/+=]{40})["\']?/, severity: 'high' },
    { type: 'Google API Key', regex: /AIza[0-9A-Za-z\\-_]{35}/, severity: 'medium' },
    { type: 'Firebase Key', regex: /firebase.*[=:]\s*["\']?([A-Za-z0-9-_]{39})["\']?/i, severity: 'medium' },
    { type: 'Stripe API Key', regex: /(sk|pk)_(test|live)_[0-9a-zA-Z]{24}/, severity: 'high' },
    { type: 'JWT Token', regex: /eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/, severity: 'medium' },
    { type: 'Database URL', regex: /(postgres|mysql|mongodb):\/\/[^\s"']+/, severity: 'high' },
    { type: 'Generic API Key', regex: /api[_-]?key['"]?\s*[:=]\s*['"]?([a-zA-Z0-9_-]{20,})/i, severity: 'medium' },
    { type: 'Generic Secret', regex: /secret['"]?\s*[:=]\s*['"]?([a-zA-Z0-9_-]{16,})/i, severity: 'medium' },
    { type: 'Private Key', regex: /-----BEGIN PRIVATE KEY-----/, severity: 'critical' },
    { type: 'SSH Private Key', regex: /-----BEGIN RSA PRIVATE KEY-----/, severity: 'critical' },
    { type: 'GitHub Token', regex: /gh[pousr]_[A-Za-z0-9_]{36}/, severity: 'high' },
    { type: 'Slack Token', regex: /xox[baprs]-[0-9A-Za-z-]{10,}/, severity: 'medium' },
    { type: 'SendGrid API Key', regex: /SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/, severity: 'high' },
    { type: 'Mailgun API Key', regex: /key-[0-9a-f]{32}/, severity: 'medium' },
    { type: 'PayPal Client ID', regex: /A[A-Za-z0-9_-]{80}/, severity: 'medium' },
    { type: 'Square Access Token', regex: /sq0atp-[0-9A-Za-z\-_]{22}/, severity: 'high' },
    { type: 'Twitter Access Token', regex: /[1-9][0-9]+-[0-9a-zA-Z]{40}/, severity: 'medium' },
    { type: 'Facebook Access Token', regex: /EAA[0-9A-Za-z]+/, severity: 'medium' },
    { type: 'Discord Bot Token', regex: /[MN][A-Za-z\d]{23}\.[\w-]{6}\.[\w-]{27}/, severity: 'medium' },
    { type: 'Telegram Bot Token', regex: /[0-9]{8,10}:[a-zA-Z0-9_-]{35}/, severity: 'medium' }
  ];

  const lines = content.split('\n');
  const isLikelyMinified = (line: string): boolean => {
    // Check for signs of minification - long lines with few breaks or many adjacent symbols
    const hasManySeparators = /[;{}():,]{10,}/.test(line);
    return line.length > 500 && (line.split(/\s+/).length < line.length / 20 || hasManySeparators);
  };
  
  const findings: Array<LeakWithSupabase> = [];
  
  lines.forEach((line, lineNumber) => {
    // Skip extremely long minified lines to avoid false positives
    if (isLikelyMinified(line)) {
      return;
    }
    
    patterns.forEach(pattern => {
      const matches = line.match(pattern.regex);
      if (matches) {
        const fullMatch = matches[0];
        const contextStart = Math.max(0, line.indexOf(fullMatch) - 20);
        const contextEnd = Math.min(line.length, line.indexOf(fullMatch) + fullMatch.length + 20);
        const context = line.substring(contextStart, contextEnd);
        
        findings.push({
          type: pattern.type,
          preview: `Line ${lineNumber + 1}: ...${context}...`,
          details: `Found potential ${pattern.type} at line ${lineNumber + 1}. Severity: ${pattern.severity}`
        });
      }
    });
  });
  
  // Check for Supabase credentials
  const supabaseUrlMatch = content.match(/https:\/\/[a-z]{20}\.supabase\.co/);
  const supabaseKeyMatch = content.match(/eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/);
  
  if (supabaseUrlMatch && supabaseKeyMatch) {
    const supabaseCredentials: SupabaseCredentials = {
      url: supabaseUrlMatch[0],
      key: supabaseKeyMatch[0]
    };
    
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
  const totalHeaders = headerPresent + headerMissing;
  const headerScore = totalHeaders > 0 ? (headerPresent / totalHeaders) * 100 : 0;
  
  // Deduct points for each leak found
  const leakPenalty = Math.min(leaks * 10, 50); // Max 50 point penalty
  
  const finalScore = Math.max(0, headerScore - leakPenalty);
  return Math.round(finalScore);
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

    const domain = new URL(targetUrl).hostname;

    // Check if domain exists
    try {
      await dnsLookup(domain);
    } catch (error) {
      return NextResponse.json({ 
        error: 'Domain does not exist or is not accessible',
        domain: domain
      }, { status: 400 });
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
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Check user subscription
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_plan')
        .eq('id', user.id)
        .single()

      if (profileError) {
        return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
      }

      if (!profile.subscription_plan || profile.subscription_plan === 'free') {
        return NextResponse.json({ 
          error: 'Premium subscription required',
          message: 'This feature requires a premium subscription'
        }, { status: 403 })
      }
    }

    // Proceed with the scan
    const response = await axios.get(targetUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const html = response.data;
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

    // Check security headers
    const headerCheck = checkSecurityHeaders(normalizedHeaders);

    // Get JavaScript content
    const { urls: jsUrls, inlineCode } = extractJsContent(targetUrl, targetUrl);

    // Fetch and analyze JavaScript files
    const allJsContent = [...inlineCode];
    let jsFilesScanned = inlineCode.length;

    for (const jsUrl of jsUrls.slice(0, 10)) { // Limit to first 10 JS files
      try {
        const jsResponse = await axios.get(jsUrl, {
          timeout: 5000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        allJsContent.push(jsResponse.data);
        jsFilesScanned++;
      } catch (error) {
        // Skip files that can't be fetched
        continue;
      }
    }

    // Check for API keys and leaks in all content
    const htmlLeaks = checkForApiKeys(html);
    const jsLeaks = allJsContent.flatMap(js => checkForApiKeys(js));
    const allLeaks = [...htmlLeaks, ...jsLeaks];

    // Remove duplicates based on type and preview
    const uniqueLeaks = allLeaks.filter((leak, index, self) => 
      index === self.findIndex(l => l.type === leak.type && l.preview === leak.preview)
    );

    // Check auth pages for CAPTCHA protection
    const authAnalysis = await checkAuthPagesForCaptcha(targetUrl, html);

    // Calculate security score
    const score = calculateScore(headerCheck.present.length, headerCheck.missing.length, uniqueLeaks.length);

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
          }
        } catch (error) {
          console.error('Error testing RLS:', error);
        }
        break; // Only test the first Supabase instance found
      }
    }

    return NextResponse.json({
      url: targetUrl,
      score,
      security_headers: {
        score: Math.round((headerCheck.present.length / (headerCheck.present.length + headerCheck.missing.length)) * 100) || 0,
        present: headerCheck.present,
        missing: headerCheck.missing
      },
      api_keys_and_leaks: {
        js_files_scanned: jsFilesScanned,
        leaks_found: uniqueLeaks,
        enhanced_analysis: {
          total_leaks: uniqueLeaks.length,
          critical_leaks: uniqueLeaks.filter(l => l.details.includes('critical')).length,
          high_leaks: uniqueLeaks.filter(l => l.details.includes('high')).length,
          medium_leaks: uniqueLeaks.filter(l => l.details.includes('medium')).length
        }
      },
      auth_analysis: authAnalysis,
      supabase_rls_test: rlsVulnerability,
      scan_metadata: {
        timestamp: new Date().toISOString(),
        js_files_analyzed: jsFilesScanned,
        total_checks_performed: headerCheck.present.length + headerCheck.missing.length + uniqueLeaks.length
      }
    });

  } catch (error: any) {
    console.error('Scan error:', error);
    
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