import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Debug endpoint to test deep scan orchestrator connectivity
export async function GET(request: NextRequest) {
  try {
    console.log('🔧 Debug: Testing deep scan orchestrator connectivity');
    
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
    
    // Get recent deep scan requests to check database connectivity
    const { data: requests, error: dbError } = await supabase
      .from('deep_scan_requests')
      .select('id, status, created_at, error_message')
      .order('created_at', { ascending: false })
      .limit(5);
    
    // Test orchestrator endpoint connectivity
    let orchestratorTest = null;
    try {
      const testResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/deep-scan/orchestrator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({ 
          deep_scan_request_id: 'test-connection-only' 
        })
      });
      
      orchestratorTest = {
        status: testResponse.status,
        statusText: testResponse.statusText,
        responseText: await testResponse.text()
      };
    } catch (orchError) {
      orchestratorTest = {
        error: orchError instanceof Error ? orchError.message : 'Unknown error',
        stack: orchError instanceof Error ? orchError.stack : undefined
      };
    }
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environmentVariables: envCheck,
      databaseConnection: {
        success: !dbError,
        error: dbError?.message,
        recentRequests: requests?.map(r => ({
          id: r.id,
          status: r.status,
          created_at: r.created_at,
          has_error: !!r.error_message
        }))
      },
      orchestratorConnectivity: orchestratorTest,
      recommendations: generateRecommendations(envCheck, dbError, orchestratorTest)
    });
    
  } catch (error) {
    console.error('🚨 Debug endpoint error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

function generateRecommendations(envCheck: any, dbError: any, orchestratorTest: any): string[] {
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