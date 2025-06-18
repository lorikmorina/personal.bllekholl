import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Deep scan orchestrator - handles comprehensive security scanning
export async function POST(request: NextRequest) {
  try {
    // Verify authorization (should be called internally or with service key)
    const authHeader = request.headers.get('authorization');
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    // Check for proper Bearer token format OR direct service key inclusion
    const isAuthorized = authHeader && (
      authHeader === `Bearer ${serviceKey}` || 
      authHeader.includes(serviceKey!)
    );
    
    if (!isAuthorized) {
      console.error('Orchestrator authorization failed:', {
        hasAuthHeader: !!authHeader,
        authHeaderFormat: authHeader ? 'Bearer ***' : 'none',
        expectedFormat: 'Bearer <service_key>'
      });
      return NextResponse.json(
        { error: 'Unauthorized - Service key required' },
        { status: 401 }
      );
    }

    const { deep_scan_request_id } = await request.json();
    
    if (!deep_scan_request_id) {
      return NextResponse.json(
        { error: 'Missing deep_scan_request_id' },
        { status: 400 }
      );
    }

    // Create Supabase client with service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the scan request details
    const { data: scanRequest, error: fetchError } = await supabase
      .from('deep_scan_requests')
      .select('*')
      .eq('id', deep_scan_request_id)
      .single();

    if (fetchError || !scanRequest) {
      console.error('Failed to fetch scan request:', fetchError);
      return NextResponse.json(
        { error: 'Scan request not found' },
        { status: 404 }
      );
    }

    // Verify payment is completed
    if (scanRequest.payment_status !== 'completed') {
      return NextResponse.json(
        { error: 'Payment not completed for this scan request' },
        { status: 400 }
      );
    }

    console.log(`Starting comprehensive SUPER SCAN for request ${deep_scan_request_id}, URL: ${scanRequest.url}`);

    // Update status to processing
    await supabase
      .from('deep_scan_requests')
      .update({ status: 'processing' })
      .eq('id', deep_scan_request_id);

    // Start the comprehensive scan in the background
    // Using setTimeout to allow the response to return immediately
    setTimeout(async () => {
      try {
        await performSuperScan(scanRequest, supabase);
      } catch (error) {
        console.error('Background super scan failed:', error);
        
        // Update status to failed
        await supabase
          .from('deep_scan_requests')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown scan error'
          })
          .eq('id', deep_scan_request_id);
      }
    }, 1000);

    return NextResponse.json({
      success: true,
      message: 'Comprehensive super scan started successfully',
      request_id: deep_scan_request_id
    });

  } catch (error: any) {
    console.error('Orchestrator error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process scan request' },
      { status: 500 }
    );
  }
}

// Enhanced super scan function that orchestrates ALL security checks
async function performSuperScan(scanRequest: any, supabase: any) {
  const startTime = Date.now();
  const { url, jwt_token, id: requestId } = scanRequest;
  
  console.log(`🚀 Starting SUPER SCAN for ${url} - This will be comprehensive!`);
  
  // Set a maximum scan time limit (10 minutes)
  const MAX_SCAN_TIME = 10 * 60 * 1000; // 10 minutes
  let scanTimeout: NodeJS.Timeout;
  
  try {
    // Set up timeout to prevent stuck scans
    const timeoutPromise = new Promise((_, reject) => {
      scanTimeout = setTimeout(() => {
        reject(new Error(`Scan timed out after ${MAX_SCAN_TIME / 1000} seconds`));
      }, MAX_SCAN_TIME);
    });

    // Initialize optimized scan results structure
    const scanResults = {
      scan_metadata: {
        started_at: new Date().toISOString(),
        url: url,
        has_jwt_token: !!jwt_token,
        scan_version: '2.0.0',
        scan_type: 'super_scan'
      },
      // Core security findings
      security_headers: null,
      api_keys_and_leaks: null,
      supabase_analysis: null,
      subdomain_analysis: null,
      authenticated_analysis: null,
      
      // Summary data for quick access
      overall_score: 0,
      risk_summary: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      }
    };

    // Run all scans in parallel for maximum efficiency
    console.log('🔍 Running parallel scans: Headers, API leaks, Supabase, Subdomains...');
    
    const scanPromises = [
      // 1. Light scan (security headers + API keys/leaks)
      performLightScanAnalysis(url),
      
      // 2. Supabase deep scan (database analysis)
      performSupabaseAnalysis(url),
      
      // 3. Subdomain discovery
      performSubdomainAnalysis(url),
    ];

    // If JWT token provided, add authenticated analysis
    if (jwt_token) {
      scanPromises.push(performAuthenticatedAnalysis(url, jwt_token));
    }

    // Execute all scans with timeout protection
    const scanExecution = Promise.allSettled(scanPromises);
    const [
      lightScanResults,
      supabaseAnalysis,
      subdomainAnalysis,
      authenticatedAnalysis
    ] = await Promise.race([scanExecution, timeoutPromise]) as PromiseSettledResult<any>[];

    // Clear timeout since scan completed
    clearTimeout(scanTimeout);

    // Process results and handle failures gracefully
    if (lightScanResults.status === 'fulfilled') {
      scanResults.security_headers = lightScanResults.value.security_headers;
      scanResults.api_keys_and_leaks = lightScanResults.value.api_keys_and_leaks;
    } else {
      console.error('Light scan failed:', lightScanResults.reason);
      scanResults.security_headers = { error: 'Light scan failed', details: lightScanResults.reason?.message || 'Unknown error' };
      scanResults.api_keys_and_leaks = { error: 'API scan failed', details: lightScanResults.reason?.message || 'Unknown error' };
    }

    if (supabaseAnalysis.status === 'fulfilled') {
      scanResults.supabase_analysis = optimizeSupabaseData(supabaseAnalysis.value);
    } else {
      console.error('Supabase scan failed:', supabaseAnalysis.reason);
      scanResults.supabase_analysis = { error: 'Supabase scan failed', details: supabaseAnalysis.reason?.message || 'Unknown error' };
    }

    if (subdomainAnalysis.status === 'fulfilled') {
      scanResults.subdomain_analysis = subdomainAnalysis.value;
    } else {
      console.error('Subdomain scan failed:', subdomainAnalysis.reason);
      scanResults.subdomain_analysis = { error: 'Subdomain scan failed', details: subdomainAnalysis.reason?.message || 'Unknown error' };
    }
    
    if (jwt_token && authenticatedAnalysis && authenticatedAnalysis.status === 'fulfilled') {
      scanResults.authenticated_analysis = authenticatedAnalysis.value;
    } else if (jwt_token && authenticatedAnalysis && authenticatedAnalysis.status === 'rejected') {
      console.error('Authenticated analysis failed:', authenticatedAnalysis.reason);
      scanResults.authenticated_analysis = { error: 'Authenticated analysis failed', details: authenticatedAnalysis.reason?.message || 'Unknown error' };
    }

    // Calculate overall security score and risk summary
    const { score, summary } = calculateOverallScore(scanResults);
    scanResults.overall_score = score;
    scanResults.risk_summary = summary;

    // Add completion metadata
    scanResults.scan_metadata.completed_at = new Date().toISOString();
    scanResults.scan_metadata.duration_ms = Date.now() - startTime;

    console.log(`✅ Super scan completed for ${url} with score: ${score} in ${scanResults.scan_metadata.duration_ms}ms`);

    // Generate PDF report
    const pdfUrl = await generatePdfReport(scanResults, scanRequest);

    // Update the database with optimized results
    await supabase
      .from('deep_scan_requests')
      .update({
        status: 'completed',
        scan_results: scanResults,
        pdf_url: pdfUrl,
        completed_at: new Date().toISOString()
      })
      .eq('id', requestId);

    // Send notification email
    await sendCompletionEmail(scanRequest, scanResults, pdfUrl);

    console.log(`🎉 Super scan fully completed for request ${requestId}`);

  } catch (error) {
    // Make sure to clear timeout on error
    if (scanTimeout) {
      clearTimeout(scanTimeout);
    }
    
    console.error('Super scan failed:', error);
    
    // Update status to failed with detailed error message
    await supabase
      .from('deep_scan_requests')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown scan error',
        completed_at: new Date().toISOString()
      })
      .eq('id', requestId);
    
    throw error;
  }
}

// Enhanced scan functions using our existing APIs

async function performLightScanAnalysis(url: string) {
  try {
    console.log('🔍 Running light scan analysis for:', url);
    
    // Set a timeout for the light scan specifically (2 minutes)
    const LIGHT_SCAN_TIMEOUT = 2 * 60 * 1000; // 2 minutes
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), LIGHT_SCAN_TIMEOUT);
    
    try {
      // Use our existing /api/scan endpoint for comprehensive light scanning
      const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/scan`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Internal-Scan': 'true' // Flag to bypass auth for internal calls
        },
        body: JSON.stringify({ url }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Light scan API failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const lightScanResults = await response.json();
      
      // Split the results into security headers and API leaks
      return {
        security_headers: {
          present: lightScanResults.headers?.present || [],
          missing: lightScanResults.headers?.missing || [],
          score: calculateHeadersScore(lightScanResults.headers),
          recommendations: generateHeaderRecommendations(lightScanResults.headers?.missing || [])
        },
        api_keys_and_leaks: {
          leaks_found: lightScanResults.leaks || [],
          js_files_scanned: lightScanResults.jsFilesScanned || 0,
          score: lightScanResults.score || 0,
          auth_pages: lightScanResults.authPages || {},
          enhanced_analysis: enhanceLeaksAnalysis(lightScanResults.leaks || [])
        }
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }

  } catch (error) {
    console.error('Light scan analysis failed:', error);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Light scan timed out after 2 minutes');
    }
    throw error;
  }
}

async function performSupabaseAnalysis(url: string) {
  try {
    console.log('🗄️ Running Supabase deep scan for:', url);
    
    // Extract domain from URL for Supabase scanning
    const domain = new URL(url).hostname;
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/supabase-deep-scan`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` // Internal auth
      },
      body: JSON.stringify({ domain })
    });

    if (!response.ok) {
      const errorData = await response.json();
      if (errorData.error === 'credentials_not_found') {
        return { supabase_detected: false, message: 'No Supabase credentials found' };
      }
      throw new Error(`Supabase scan failed: ${errorData.message || response.statusText}`);
    }

    const supabaseResults = await response.json();
    return {
      supabase_detected: true,
      ...supabaseResults
    };

  } catch (error) {
    console.error('Supabase analysis failed:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to analyze Supabase',
      supabase_detected: false
    };
  }
}

async function performSubdomainAnalysis(url: string) {
  try {
    console.log('🌐 Running subdomain discovery for:', url);
    
    // Extract domain from URL
    const domain = new URL(url).hostname.replace(/^www\./, '');
    
    // Use subdomain enumeration techniques
    const subdomains = await discoverSubdomains(domain);
    
    // Test each subdomain for common vulnerabilities
    const subdomainResults = [];
    for (const subdomain of subdomains.slice(0, 10)) { // Limit to 10 for performance
      try {
        const subdomainUrl = `https://${subdomain}`;
        const response = await fetch(subdomainUrl, { 
          method: 'HEAD', 
          timeout: 5000,
          headers: { 'User-Agent': 'SecureVibing-SuperScan/2.0' }
        });
        
        subdomainResults.push({
          subdomain,
          status: response.status,
          accessible: response.ok,
          headers: Object.fromEntries(response.headers.entries())
        });
      } catch (error) {
        subdomainResults.push({
          subdomain,
          status: 0,
          accessible: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return {
      total_found: subdomains.length,
      tested_subdomains: subdomainResults,
      accessible_count: subdomainResults.filter(s => s.accessible).length,
      scan_method: 'dns_enumeration'
    };

  } catch (error) {
    console.error('Subdomain analysis failed:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to analyze subdomains',
      total_found: 0,
      tested_subdomains: []
    };
  }
}

async function performAuthenticatedAnalysis(url: string, jwtToken: string) {
  try {
    console.log('🔐 Running authenticated analysis for:', url);
    
    // Validate JWT token structure
    const jwtParts = jwtToken.split('.');
    if (jwtParts.length !== 3) {
      return {
        jwt_token_valid: false,
        error: 'Invalid JWT token format',
        tested_endpoints: []
      };
    }

    // Test common API endpoints with the JWT token
    const testEndpoints = [
      '/api/user/profile',
      '/api/users',
      '/api/admin',
      '/rest/v1/profiles',
      '/rest/v1/users'
    ];

    const endpointResults = [];
    
    for (const endpoint of testEndpoints) {
      try {
        const testUrl = new URL(endpoint, url).toString();
        const response = await fetch(testUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${jwtToken}`,
            'User-Agent': 'SecureVibing-AuthTest/2.0'
          },
          timeout: 5000
        });

        endpointResults.push({
          endpoint,
          status: response.status,
          accessible: response.ok,
          response_size: response.headers.get('content-length') || 'unknown'
        });
      } catch (error) {
        endpointResults.push({
          endpoint,
          status: 0,
          accessible: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return {
      jwt_token_valid: true,
      tested_endpoints: endpointResults,
      accessible_endpoints: endpointResults.filter(e => e.accessible).length,
      permission_findings: analyzePermissions(endpointResults)
    };

  } catch (error) {
    console.error('Authenticated analysis failed:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to perform authenticated analysis',
      jwt_token_valid: false,
      tested_endpoints: []
    };
  }
}

// Utility functions

function optimizeSupabaseData(supabaseResults: any) {
  // Optimize Supabase data for storage - compress large table schemas
  if (!supabaseResults || !supabaseResults.tables) {
    return supabaseResults;
  }

  const optimizedTables = supabaseResults.tables.map((table: any) => {
    // For tables with many columns, store only essential info
    let optimizedColumns = table.columns;
    
    if (table.columns && table.columns.length > 20) {
      // For large schemas, store only critical columns info
      optimizedColumns = {
        total_columns: table.columns.length,
        sample_columns: table.columns.slice(0, 5), // First 5 columns as sample
        has_sensitive_columns: table.columns.some((col: any) => 
          ['password', 'email', 'token', 'key', 'secret'].some(sensitive => 
            col.name.toLowerCase().includes(sensitive)
          )
        )
      };
    }

    return {
      name: table.name,
      columns: optimizedColumns,
      isPublic: table.isPublic,
      rlsEnabled: table.rlsEnabled,
      errorMessage: table.errorMessage
    };
  });

  return {
    ...supabaseResults,
    tables: optimizedTables,
    optimization_applied: optimizedTables.some(t => t.columns.total_columns)
  };
}

async function discoverSubdomains(domain: string): Promise<string[]> {
  // Basic subdomain discovery - in production, this could use more advanced techniques
  const commonSubdomains = [
    'www', 'api', 'app', 'admin', 'dev', 'staging', 'test', 'beta', 
    'cdn', 'mail', 'blog', 'shop', 'support', 'docs', 'portal',
    'dashboard', 'auth', 'login', 'secure', 'vpn', 'ftp'
  ];

  const foundSubdomains: string[] = [];
  
  for (const sub of commonSubdomains) {
    try {
      const subdomain = `${sub}.${domain}`;
      // Simple DNS lookup simulation - in production, use proper DNS resolution
      const response = await fetch(`https://${subdomain}`, { 
        method: 'HEAD', 
        timeout: 3000 
      });
      if (response.ok) {
        foundSubdomains.push(subdomain);
      }
    } catch (error) {
      // Subdomain doesn't exist or isn't accessible
    }
  }

  return foundSubdomains;
}

function calculateHeadersScore(headers: any): number {
  if (!headers || !headers.present) return 0;
  
  const totalHeaders = (headers.present?.length || 0) + (headers.missing?.length || 0);
  if (totalHeaders === 0) return 0;
  
  return Math.round((headers.present.length / totalHeaders) * 100);
}

function generateHeaderRecommendations(missingHeaders: string[]): string[] {
  const recommendations: { [key: string]: string } = {
    'strict-transport-security': 'Add HSTS header to force HTTPS connections',
    'content-security-policy': 'Implement CSP to prevent XSS attacks',
    'x-frame-options': 'Add X-Frame-Options to prevent clickjacking',
    'x-content-type-options': 'Add X-Content-Type-Options to prevent MIME sniffing',
    'referrer-policy': 'Control referrer information with Referrer-Policy',
    'permissions-policy': 'Restrict browser features with Permissions-Policy'
  };
  
  return missingHeaders.map(header => 
    recommendations[header] || `Add ${header} header for enhanced security`
  );
}

function enhanceLeaksAnalysis(leaks: any[]): any {
  const analysis = {
    critical_leaks: leaks.filter(leak => leak.severity === 'critical').length,
    high_leaks: leaks.filter(leak => leak.severity === 'warning' || leak.severity === 'high').length,
    medium_leaks: leaks.filter(leak => leak.severity === 'medium').length,
    low_leaks: leaks.filter(leak => leak.severity === 'low' || leak.severity === 'info').length,
    total_leaks: leaks.length,
    most_critical: leaks.find(leak => leak.severity === 'critical') || null,
    leak_types: [...new Set(leaks.map(leak => leak.type))]
  };

  return analysis;
}

function analyzePermissions(endpointResults: any[]): any[] {
  const findings = [];
  
  // Check for overly permissive endpoints
  const accessibleEndpoints = endpointResults.filter(e => e.accessible);
  
  if (accessibleEndpoints.length > 3) {
    findings.push({
      type: 'excessive_access',
      severity: 'medium',
      message: `JWT token provides access to ${accessibleEndpoints.length} endpoints - review permissions`
    });
  }

  // Check for admin access
  const adminAccess = accessibleEndpoints.find(e => e.endpoint.includes('admin'));
  if (adminAccess) {
    findings.push({
      type: 'admin_access',
      severity: 'high',
      message: 'JWT token has admin-level access - ensure this is intended'
    });
  }

  return findings;
}

function calculateOverallScore(scanResults: any): { score: number; summary: any } {
  let totalScore = 0;
  let componentCount = 0;
  
  const summary = { critical: 0, high: 0, medium: 0, low: 0 };
  
  // Security headers score (20% weight)
  if (scanResults.security_headers && !scanResults.security_headers.error) {
    totalScore += scanResults.security_headers.score * 0.2;
    componentCount += 0.2;
    summary.low += scanResults.security_headers.missing?.length || 0;
  }
  
  // API keys score (40% weight - most important)
  if (scanResults.api_keys_and_leaks && !scanResults.api_keys_and_leaks.error) {
    totalScore += scanResults.api_keys_and_leaks.score * 0.4;
    componentCount += 0.4;
    
    const analysis = scanResults.api_keys_and_leaks.enhanced_analysis;
    if (analysis) {
      summary.critical += analysis.critical_leaks || 0;
      summary.high += analysis.high_leaks || 0;
      summary.medium += analysis.medium_leaks || 0;
      summary.low += analysis.low_leaks || 0;
    }
  }
  
  // Supabase score (30% weight)
  if (scanResults.supabase_analysis && scanResults.supabase_analysis.supabase_detected && !scanResults.supabase_analysis.error) {
    const supabaseScore = calculateSupabaseScore(scanResults.supabase_analysis);
    totalScore += supabaseScore * 0.3;
    componentCount += 0.3;
    
    // Add Supabase-specific risks
    if (scanResults.supabase_analysis.summary) {
      summary.critical += scanResults.supabase_analysis.summary.publicTables || 0;
    }
  }
  
  // Subdomain score (10% weight)
  if (scanResults.subdomain_analysis && !scanResults.subdomain_analysis.error) {
    const subdomainScore = calculateSubdomainScore(scanResults.subdomain_analysis);
    totalScore += subdomainScore * 0.1;
    componentCount += 0.1;
  }
  
  // Calculate weighted average score
  const averageScore = componentCount > 0 ? Math.round(totalScore / componentCount) : 0;
  
  return { score: Math.max(0, Math.min(100, averageScore)), summary };
}

function calculateSupabaseScore(supabaseAnalysis: any): number {
  if (!supabaseAnalysis.summary) return 100;
  
  const { totalTables, publicTables, protectedTables } = supabaseAnalysis.summary;
  
  if (totalTables === 0) return 100;
  
  // Score based on percentage of protected tables
  const protectionRate = protectedTables / totalTables;
  return Math.round(protectionRate * 100);
}

function calculateSubdomainScore(subdomainAnalysis: any): number {
  const { total_found, accessible_count } = subdomainAnalysis;
  
  // Lower score if many subdomains are accessible (potential attack surface)
  if (total_found === 0) return 100;
  
  const exposureRate = accessible_count / total_found;
  return Math.round((1 - exposureRate) * 100);
}

async function generatePdfReport(scanResults: any, scanRequest: any): Promise<string | null> {
  try {
    console.log('📄 Generating comprehensive PDF report...');
    
    // TODO: Implement advanced PDF generation for super scan
    // This will include all scan results in a professional format
    
    return null;
    
  } catch (error) {
    console.error('PDF generation failed:', error);
    return null;
  }
}

async function sendCompletionEmail(scanRequest: any, scanResults: any, pdfUrl: string | null) {
  try {
    console.log('📧 Sending comprehensive scan completion email...');
    
    // TODO: Implement enhanced email with super scan summary
    console.log(`Email would be sent to: ${scanRequest.user_email}`);
    console.log(`Super scan score: ${scanResults.overall_score}`);
    console.log(`Critical issues: ${scanResults.risk_summary.critical}`);
    
  } catch (error) {
    console.error('Email sending failed:', error);
  }
} 