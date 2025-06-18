import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Deep scan orchestrator - handles comprehensive security scanning
export async function POST(request: NextRequest) {
  try {
    // Verify authorization (should be called internally or with service key)
    const authHeader = request.headers.get('authorization');
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!authHeader || !authHeader.includes(serviceKey!)) {
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

    console.log(`Starting deep scan for request ${deep_scan_request_id}, URL: ${scanRequest.url}`);

    // Update status to processing
    await supabase
      .from('deep_scan_requests')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', deep_scan_request_id);

    // Start the comprehensive scan in the background
    // Using setTimeout to allow the response to return immediately
    setTimeout(async () => {
      try {
        await performComprehensiveScan(scanRequest, supabase);
      } catch (error) {
        console.error('Background scan failed:', error);
        
        // Update status to failed
        await supabase
          .from('deep_scan_requests')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown scan error',
            updated_at: new Date().toISOString()
          })
          .eq('id', deep_scan_request_id);
      }
    }, 1000);

    return NextResponse.json({
      success: true,
      message: 'Deep scan started successfully',
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

// Main scan function that orchestrates all security checks
async function performComprehensiveScan(scanRequest: any, supabase: any) {
  const startTime = Date.now();
  const { url, jwt_token, id: requestId } = scanRequest;
  
  console.log(`Starting comprehensive scan for ${url}`);
  
  try {
    // Initialize scan results structure
    const scanResults = {
      scan_metadata: {
        started_at: new Date().toISOString(),
        url: url,
        has_jwt_token: !!jwt_token,
        scan_version: '1.0.0'
      },
      security_headers: null,
      api_keys_and_leaks: null,
      supabase_analysis: null,
      authenticated_analysis: null, // Only if JWT provided
      overall_score: 0,
      risk_summary: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      }
    };

    // Run all scans in parallel for efficiency
    const scanPromises = [
      // 1. Security headers analysis
      performSecurityHeadersAnalysis(url),
      
      // 2. API keys and sensitive data detection
      performApiKeysAndLeaksAnalysis(url),
      
      // 3. Supabase-specific analysis
      performSupabaseAnalysis(url),
    ];

    // If JWT token provided, add authenticated analysis
    if (jwt_token) {
      scanPromises.push(performAuthenticatedAnalysis(url, jwt_token));
    }

    // Execute all scans
    const [
      securityHeaders,
      apiKeysLeaks,
      supabaseAnalysis,
      authenticatedAnalysis
    ] = await Promise.all(scanPromises);

    // Compile results
    scanResults.security_headers = securityHeaders;
    scanResults.api_keys_and_leaks = apiKeysLeaks;
    scanResults.supabase_analysis = supabaseAnalysis;
    
    if (jwt_token && authenticatedAnalysis) {
      scanResults.authenticated_analysis = authenticatedAnalysis;
    }

    // Calculate overall security score and risk summary
    const { score, summary } = calculateOverallScore(scanResults);
    scanResults.overall_score = score;
    scanResults.risk_summary = summary;

    // Add completion metadata
    scanResults.scan_metadata.completed_at = new Date().toISOString();
    scanResults.scan_metadata.duration_ms = Date.now() - startTime;

    console.log(`Scan completed for ${url} with score: ${score}`);

    // Generate PDF report
    const pdfUrl = await generatePdfReport(scanResults, scanRequest);

    // Update the database with results
    await supabase
      .from('deep_scan_requests')
      .update({
        status: 'completed',
        scan_results: scanResults,
        pdf_url: pdfUrl,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);

    // Send notification email
    await sendCompletionEmail(scanRequest, scanResults, pdfUrl);

    console.log(`Deep scan fully completed for request ${requestId}`);

  } catch (error) {
    console.error('Scan failed:', error);
    throw error;
  }
}

// Individual scan functions
async function performSecurityHeadersAnalysis(url: string) {
  try {
    console.log('Analyzing security headers for:', url);
    
    // Make request to get headers
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': 'SecureVibing-DeepScan/1.0'
      }
    });

    const headers = Object.fromEntries(response.headers.entries());
    
    // Define security headers to check
    const securityHeaders = {
      'strict-transport-security': 'HSTS',
      'content-security-policy': 'CSP',
      'x-content-type-options': 'Content Type Options',
      'x-frame-options': 'Frame Options',
      'x-xss-protection': 'XSS Protection',
      'referrer-policy': 'Referrer Policy',
      'permissions-policy': 'Permissions Policy',
      'cross-origin-embedder-policy': 'COEP',
      'cross-origin-opener-policy': 'COOP',
      'cross-origin-resource-policy': 'CORP'
    };

    const analysis = {
      present: [] as any[],
      missing: [] as any[],
      score: 0,
      recommendations: [] as string[]
    };

    // Check each security header
    Object.entries(securityHeaders).forEach(([headerKey, headerName]) => {
      const headerValue = headers[headerKey] || headers[headerKey.toLowerCase()];
      
      if (headerValue) {
        analysis.present.push({
          header: headerKey,
          name: headerName,
          value: headerValue,
          assessment: assessHeaderValue(headerKey, headerValue)
        });
      } else {
        analysis.missing.push({
          header: headerKey,
          name: headerName,
          risk_level: getHeaderRiskLevel(headerKey),
          recommendation: getHeaderRecommendation(headerKey)
        });
      }
    });

    // Calculate score (present headers / total headers * 100)
    analysis.score = Math.round((analysis.present.length / Object.keys(securityHeaders).length) * 100);

    return analysis;

  } catch (error) {
    console.error('Security headers analysis failed:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to analyze security headers',
      present: [],
      missing: [],
      score: 0
    };
  }
}

async function performApiKeysAndLeaksAnalysis(url: string) {
  try {
    console.log('Analyzing API keys and leaks for:', url);
    
    // This reuses logic from the existing LightScan
    const response = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      throw new Error(`Scan API failed: ${response.statusText}`);
    }

    const lightScanResults = await response.json();
    
    return {
      leaks_found: lightScanResults.leaks || [],
      js_files_scanned: lightScanResults.jsFilesScanned || 0,
      score: lightScanResults.score || 0,
      enhanced_analysis: enhanceLeaksAnalysis(lightScanResults.leaks || [])
    };

  } catch (error) {
    console.error('API keys analysis failed:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to analyze API keys',
      leaks_found: [],
      js_files_scanned: 0,
      score: 0
    };
  }
}

async function performSupabaseAnalysis(url: string) {
  try {
    console.log('Performing Supabase analysis for:', url);
    
    // This could call the existing Supabase deep scan API
    const response = await fetch('/api/supabase-deep-scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Supabase scan response not ok:', errorText);
      return { no_supabase_detected: true };
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

async function performAuthenticatedAnalysis(url: string, jwtToken: string) {
  try {
    console.log('Performing authenticated analysis for:', url);
    
    // This would test API endpoints with the provided JWT token
    // Check for CRUD operations, permission boundaries, etc.
    
    return {
      jwt_token_valid: true,
      tested_endpoints: [],
      permission_findings: [],
      score: 85 // Placeholder
    };

  } catch (error) {
    console.error('Authenticated analysis failed:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to perform authenticated analysis',
      jwt_token_valid: false
    };
  }
}

// Helper functions
function assessHeaderValue(headerKey: string, value: string): string {
  // Provide assessment of header value quality
  switch (headerKey) {
    case 'strict-transport-security':
      return value.includes('max-age') ? 'Good' : 'Needs improvement';
    case 'content-security-policy':
      return value.includes('script-src') ? 'Good' : 'Basic';
    default:
      return 'Present';
  }
}

function getHeaderRiskLevel(headerKey: string): string {
  const highRisk = ['strict-transport-security', 'content-security-policy'];
  const mediumRisk = ['x-frame-options', 'x-content-type-options'];
  
  if (highRisk.includes(headerKey)) return 'high';
  if (mediumRisk.includes(headerKey)) return 'medium';
  return 'low';
}

function getHeaderRecommendation(headerKey: string): string {
  const recommendations: { [key: string]: string } = {
    'strict-transport-security': 'Add HSTS header to force HTTPS connections',
    'content-security-policy': 'Implement CSP to prevent XSS attacks',
    'x-frame-options': 'Add X-Frame-Options to prevent clickjacking',
    'x-content-type-options': 'Add X-Content-Type-Options to prevent MIME sniffing',
    // Add more recommendations...
  };
  
  return recommendations[headerKey] || `Add ${headerKey} header for enhanced security`;
}

function enhanceLeaksAnalysis(leaks: any[]): any {
  // Enhanced analysis of found leaks with severity and recommendations
  return {
    critical_leaks: leaks.filter(leak => leak.severity === 'critical').length,
    high_leaks: leaks.filter(leak => leak.severity === 'warning').length,
    total_leaks: leaks.length,
    most_critical: leaks.find(leak => leak.severity === 'critical') || null
  };
}

function calculateOverallScore(scanResults: any): { score: number; summary: any } {
  let totalScore = 0;
  let componentCount = 0;
  
  const summary = { critical: 0, high: 0, medium: 0, low: 0 };
  
  // Security headers score
  if (scanResults.security_headers && !scanResults.security_headers.error) {
    totalScore += scanResults.security_headers.score;
    componentCount++;
    summary.low += scanResults.security_headers.missing.length;
  }
  
  // API keys score
  if (scanResults.api_keys_and_leaks && !scanResults.api_keys_and_leaks.error) {
    totalScore += scanResults.api_keys_and_leaks.score;
    componentCount++;
    
    // Count critical issues
    const leaks = scanResults.api_keys_and_leaks.leaks_found || [];
    summary.critical += leaks.filter((leak: any) => leak.severity === 'critical').length;
    summary.high += leaks.filter((leak: any) => leak.severity === 'warning').length;
  }
  
  // Calculate average score
  const averageScore = componentCount > 0 ? Math.round(totalScore / componentCount) : 0;
  
  return { score: averageScore, summary };
}

async function generatePdfReport(scanResults: any, scanRequest: any): Promise<string | null> {
  try {
    console.log('Generating PDF report...');
    
    // TODO: Implement PDF generation using a library like puppeteer or jsPDF
    // For now, return null - this will be implemented later
    
    return null;
    
  } catch (error) {
    console.error('PDF generation failed:', error);
    return null;
  }
}

async function sendCompletionEmail(scanRequest: any, scanResults: any, pdfUrl: string | null) {
  try {
    console.log('Sending completion email...');
    
    // TODO: Implement email sending using Resend API
    // For now, just log
    console.log(`Email would be sent to: ${scanRequest.user_email}`);
    console.log(`Scan score: ${scanResults.overall_score}`);
    
  } catch (error) {
    console.error('Email sending failed:', error);
  }
} 