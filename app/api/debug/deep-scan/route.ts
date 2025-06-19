import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Debug endpoint to test deep scan orchestrator connectivity
export async function GET(request: NextRequest) {
  try {
    console.log('🔧 Debug: Testing deep scan orchestrator connectivity');
    
    // Check for specific request ID in query params
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('request_id');
    
    // Check environment variables
    const envCheck = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      NEXT_PUBLIC_SITE_URL: !!process.env.NEXT_PUBLIC_SITE_URL,
      NEXT_PUBLIC_PADDLE_DEEP_SCAN_PRICE_ID: !!process.env.NEXT_PUBLIC_PADDLE_DEEP_SCAN_PRICE_ID,
      PADDLE_WEBHOOK_SECRET_KEY: !!process.env.PADDLE_WEBHOOK_SECRET_KEY
    };
    
    console.log('🔍 Environment variables check:', envCheck);
    
    // Test Supabase connection
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // If specific request ID provided, check that request
    let specificRequest = null;
    if (requestId) {
      const { data: specificData, error: specificError } = await supabase
        .from('deep_scan_requests')
        .select('*')
        .eq('id', requestId)
        .single();
      
      specificRequest = {
        found: !!specificData,
        error: specificError?.message,
        data: specificData ? {
          id: specificData.id,
          status: specificData.status,
          payment_status: specificData.payment_status,
          created_at: specificData.created_at,
          completed_at: specificData.completed_at,
          error_message: specificData.error_message,
          url: specificData.url,
          has_scan_results: !!specificData.scan_results,
          scan_duration: specificData.created_at ? 
            Math.round((new Date().getTime() - new Date(specificData.created_at).getTime()) / 1000) : null
        } : null
      };
    }
    
    // Get recent deep scan requests to check database connectivity
    const { data: requests, error: dbError } = await supabase
      .from('deep_scan_requests')
      .select('id, status, created_at, error_message, payment_status, user_id')
      .order('created_at', { ascending: false })
      .limit(10);
    
    console.log('📋 Recent deep scan requests:', requests?.map(r => ({
      id: r.id,
      status: r.status,
      payment_status: r.payment_status,
      created_at: r.created_at
    })));
    
    // Test orchestrator endpoint connectivity with a real request ID if available
    let orchestratorTest = null;
    const testRequestId = requestId || (requests && requests.length > 0 ? requests[0].id : 'test-connection-only');
    
    try {
      const testResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/deep-scan/orchestrator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({ 
          deep_scan_request_id: testRequestId 
        })
      });
      
      orchestratorTest = {
        status: testResponse.status,
        statusText: testResponse.statusText,
        responseText: await testResponse.text(),
        testedWithRequestId: testRequestId,
        isRealRequest: testRequestId !== 'test-connection-only'
      };
    } catch (orchError) {
      orchestratorTest = {
        error: orchError instanceof Error ? orchError.message : 'Unknown error',
        stack: orchError instanceof Error ? orchError.stack : undefined,
        testedWithRequestId: testRequestId
      };
    }
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      requestedScanId: requestId,
      specificRequest,
      environmentVariables: envCheck,
      databaseConnection: {
        success: !dbError,
        error: dbError?.message,
        recentRequests: requests?.map(r => ({
          id: r.id,
          status: r.status,
          payment_status: r.payment_status,
          created_at: r.created_at,
          has_error: !!r.error_message,
          user_id: r.user_id?.substring(0, 8) + '...' // Partially hide user ID for privacy
        })),
        totalFound: requests?.length || 0
      },
      orchestratorConnectivity: orchestratorTest,
      recommendations: generateRecommendations(envCheck, dbError, orchestratorTest, specificRequest)
    });
    
  } catch (error) {
    console.error('🚨 Debug endpoint error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

function generateRecommendations(envCheck: any, dbError: any, orchestratorTest: any, specificRequest?: any): string[] {
  const recommendations = [];
  
  // Check for missing environment variables
  const missingEnvVars = Object.entries(envCheck)
    .filter(([key, value]) => !value)
    .map(([key]) => key);
  
  if (missingEnvVars.length > 0) {
    recommendations.push(`❌ Missing environment variables: ${missingEnvVars.join(', ')}`);
  }
  
  // Check database connectivity
  if (dbError) {
    recommendations.push(`❌ Database connection failed: ${dbError.message}`);
  }
  
  // Check specific request if provided
  if (specificRequest) {
    if (!specificRequest.found) {
      recommendations.push(`❌ Requested scan ID not found in database`);
    } else if (specificRequest.data?.status === 'processing' && specificRequest.data?.scan_duration > 600) {
      recommendations.push(`⚠️ Scan has been processing for ${specificRequest.data.scan_duration} seconds (over 10 minutes) - likely stuck`);
      recommendations.push(`💡 Try manually restarting the scan using the POST endpoint`);
    } else if (specificRequest.data?.status === 'failed') {
      recommendations.push(`❌ Scan failed: ${specificRequest.data.error_message || 'Unknown error'}`);
    }
  }
  
  // Check orchestrator connectivity
  if (orchestratorTest?.error) {
    recommendations.push(`❌ Orchestrator connection failed: ${orchestratorTest.error}`);
  } else if (orchestratorTest?.status === 401) {
    recommendations.push(`❌ Orchestrator authorization failed - check SUPABASE_SERVICE_ROLE_KEY`);
  } else if (orchestratorTest?.status === 400) {
    recommendations.push(`✅ Orchestrator is reachable but rejected test request (expected behavior)`);
  }
  
  if (recommendations.length === 0) {
    recommendations.push('✅ All systems appear to be functioning correctly');
  }
  
  return recommendations;
}

// POST method to manually trigger a scan for testing or restart a stuck scan
export async function POST(request: NextRequest) {
  try {
    const { request_id, force_restart } = await request.json();
    
    if (!request_id) {
      return NextResponse.json({
        error: 'Missing request_id parameter'
      }, { status: 400 });
    }
    
    console.log('🔧 Debug: Manually triggering scan for request:', request_id);
    
    // If force_restart is true, reset the status to processing first
    if (force_restart) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      await supabase
        .from('deep_scan_requests')
        .update({ 
          status: 'processing',
          error_message: null 
        })
        .eq('id', request_id);
        
      console.log('🔄 Reset scan status to processing');
    }
    
    // Call the orchestrator directly
    const orchestratorResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/deep-scan/orchestrator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ 
        deep_scan_request_id: request_id 
      })
    });
    
    const responseText = await orchestratorResponse.text();
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      requestId: request_id,
      forceRestart: force_restart,
      orchestratorResponse: {
        status: orchestratorResponse.status,
        statusText: orchestratorResponse.statusText,
        body: responseText
      },
      success: orchestratorResponse.ok
    });
    
  } catch (error) {
    console.error('🚨 Debug POST error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 