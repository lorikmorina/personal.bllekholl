import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Deep scan Step 4: Authenticated Analysis & Completion');
    
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    const isAuthorized = authHeader && serviceKey && (
      authHeader === `Bearer ${serviceKey}` || 
      authHeader.includes(serviceKey)
    );
    
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deep_scan_request_id } = await request.json();
    
    if (!deep_scan_request_id) {
      return NextResponse.json({ error: 'Missing deep_scan_request_id' }, { status: 400 });
    }

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
      return NextResponse.json({ error: 'Scan request not found' }, { status: 404 });
    }

    console.log(`🔐 Step 4: Authenticated analysis for ${scanRequest.url}`);
    
    try {
      // Step 4: Authenticated Analysis (if JWT token provided)
      let authenticatedResults = { authenticated_analysis: false };
      
      if (scanRequest.jwt_token) {
        authenticatedResults = await performAuthenticatedAnalysis(scanRequest.url, scanRequest.jwt_token);
      }
      
      // Get existing scan results and finalize
      let currentResults = scanRequest.scan_results || {};
      currentResults.authenticated_analysis = authenticatedResults;
      
      // Mark scan as completed
      const completedAt = new Date().toISOString();
      const startTime = new Date(currentResults.scan_metadata?.started_at || scanRequest.created_at);
      const durationMs = Date.now() - startTime.getTime();
      
      currentResults.completed_at = completedAt;
      currentResults.duration_ms = durationMs;
      currentResults.scan_metadata = {
        ...currentResults.scan_metadata,
        step: 4,
        step_4_completed: completedAt,
        total_duration_ms: durationMs,
        scan_status: 'completed'
      };
      
      // Update database with final results and mark as completed
      await supabase
        .from('deep_scan_requests')
        .update({ 
          scan_results: currentResults,
          status: 'completed' 
        })
        .eq('id', deep_scan_request_id);
      
      console.log(`✅ Deep scan completed for ${scanRequest.url} in ${durationMs}ms`);
      
      return NextResponse.json({
        success: true,
        message: 'Deep scan completed successfully',
        request_id: deep_scan_request_id,
        step: 4,
        total_steps: 4,
        duration_ms: durationMs,
        status: 'completed'
      });
      
    } catch (error) {
      console.error('Step 4 failed:', error);
      
      // Update with error and mark as completed with issues
      let currentResults = scanRequest.scan_results || {};
      currentResults.authenticated_analysis = { 
        error: error instanceof Error ? error.message : 'Authenticated analysis failed',
        authenticated_analysis: false
      };
      
      const completedAt = new Date().toISOString();
      const startTime = new Date(currentResults.scan_metadata?.started_at || scanRequest.created_at);
      const durationMs = Date.now() - startTime.getTime();
      
      currentResults.completed_at = completedAt;
      currentResults.duration_ms = durationMs;
      currentResults.scan_metadata = {
        ...currentResults.scan_metadata,
        step: 4,
        step_4_error: error instanceof Error ? error.message : 'Unknown error',
        total_duration_ms: durationMs,
        scan_status: 'completed_with_errors'
      };
      
      await supabase
        .from('deep_scan_requests')
        .update({ 
          scan_results: currentResults,
          status: 'completed' 
        })
        .eq('id', deep_scan_request_id);
      
      return NextResponse.json({
        success: true,
        message: 'Deep scan completed with some errors',
        request_id: deep_scan_request_id,
        step: 4,
        total_steps: 4,
        duration_ms: durationMs,
        status: 'completed',
        warnings: ['Authenticated analysis failed']
      });
    }

  } catch (error: any) {
    console.error('Step 4 error:', error);
    
    // Mark scan as failed
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      await supabase
        .from('deep_scan_requests')
        .update({ 
          status: 'failed',
          scan_results: {
            error: error.message,
            failed_at_step: 4
          }
        })
        .eq('id', request.json().then(body => body.deep_scan_request_id));
    } catch (updateError) {
      console.error('Failed to update scan status:', updateError);
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function performAuthenticatedAnalysis(url: string, jwtToken: string) {
  try {
    console.log('🔐 Running authenticated analysis for:', url);
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/authenticated-deep-scan`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ 
        url,
        jwt_token: jwtToken
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Authenticated scan failed: ${errorData.message || response.statusText}`);
    }

    const authResults = await response.json();
    return {
      authenticated_analysis: true,
      ...authResults
    };

  } catch (error) {
    console.error('Authenticated analysis failed:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to perform authenticated analysis',
      authenticated_analysis: false
    };
  }
} 