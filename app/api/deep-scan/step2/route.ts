import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Deep scan Step 2: Supabase Analysis');
    
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

    console.log(`🗄️ Step 2: Supabase analysis for ${scanRequest.url}`);
    
    try {
      // Step 2: Supabase Deep Scan
      const supabaseResults = await performSupabaseAnalysis(scanRequest.url);
      
      // Get existing scan results and update with Step 2
      let currentResults = scanRequest.scan_results || {};
      currentResults.supabase_analysis = supabaseResults.supabase_detected ? supabaseResults : { supabase_detected: false };
      currentResults.scan_metadata = {
        ...currentResults.scan_metadata,
        step: 2,
        step_2_completed: new Date().toISOString()
      };
      
      // Update database with Step 2 results
      await supabase
        .from('deep_scan_requests')
        .update({ scan_results: currentResults })
        .eq('id', deep_scan_request_id);
      
      console.log('✅ Step 2 completed, triggering Step 3');
      
      // Trigger Step 3
      setTimeout(async () => {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/deep-scan/step3`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
            },
            body: JSON.stringify({ deep_scan_request_id })
          });
        } catch (error) {
          console.error('Failed to trigger Step 3:', error);
        }
      }, 1000);
      
      return NextResponse.json({
        success: true,
        message: 'Step 2 completed, continuing with Step 3',
        request_id: deep_scan_request_id,
        step: 2,
        total_steps: 4
      });
      
    } catch (error) {
      console.error('Step 2 failed:', error);
      
      // Update with error but continue to next step
      let currentResults = scanRequest.scan_results || {};
      currentResults.supabase_analysis = { 
        error: error instanceof Error ? error.message : 'Supabase analysis failed',
        supabase_detected: false 
      };
      currentResults.scan_metadata = {
        ...currentResults.scan_metadata,
        step: 2,
        step_2_error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      await supabase
        .from('deep_scan_requests')
        .update({ scan_results: currentResults })
        .eq('id', deep_scan_request_id);
      
      // Continue to Step 3 even if Step 2 failed
      setTimeout(async () => {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/deep-scan/step3`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
            },
            body: JSON.stringify({ deep_scan_request_id })
          });
        } catch (triggerError) {
          console.error('Failed to trigger Step 3 after Step 2 error:', triggerError);
        }
      }, 1000);
      
      return NextResponse.json({
        success: true,
        message: 'Step 2 had errors but continuing with Step 3',
        request_id: deep_scan_request_id,
        step: 2,
        total_steps: 4,
        warnings: ['Supabase analysis failed']
      });
    }

  } catch (error: any) {
    console.error('Step 2 error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function performSupabaseAnalysis(url: string) {
  try {
    console.log('🗄️ Running Supabase deep scan for:', url);
    
    const domain = new URL(url).hostname;
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/supabase-deep-scan`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
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