import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Deep scan Step 3: Subdomain Analysis');
    
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

    console.log(`🌐 Step 3: Subdomain analysis for ${scanRequest.url}`);
    
    try {
      // Step 3: Subdomain Analysis
      const subdomainResults = await performSubdomainAnalysis(scanRequest.url);
      
      // Get existing scan results and update with Step 3
      let currentResults = scanRequest.scan_results || {};
      currentResults.subdomain_analysis = subdomainResults;
      currentResults.scan_metadata = {
        ...currentResults.scan_metadata,
        step: 3,
        step_3_completed: new Date().toISOString()
      };
      
      // Update database with Step 3 results
      await supabase
        .from('deep_scan_requests')
        .update({ scan_results: currentResults })
        .eq('id', deep_scan_request_id);
      
      console.log('✅ Step 3 completed, triggering Step 4');
      
      // Trigger Step 4 (final step)
      setTimeout(async () => {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/deep-scan/step4`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
            },
            body: JSON.stringify({ deep_scan_request_id })
          });
        } catch (error) {
          console.error('Failed to trigger Step 4:', error);
        }
      }, 1000);
      
      return NextResponse.json({
        success: true,
        message: 'Step 3 completed, continuing with Step 4',
        request_id: deep_scan_request_id,
        step: 3,
        total_steps: 4
      });
      
    } catch (error) {
      console.error('Step 3 failed:', error);
      
      // Update with error but continue to next step
      let currentResults = scanRequest.scan_results || {};
      currentResults.subdomain_analysis = { 
        error: error instanceof Error ? error.message : 'Subdomain analysis failed',
        subdomains_found: []
      };
      currentResults.scan_metadata = {
        ...currentResults.scan_metadata,
        step: 3,
        step_3_error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      await supabase
        .from('deep_scan_requests')
        .update({ scan_results: currentResults })
        .eq('id', deep_scan_request_id);
      
      // Continue to Step 4 even if Step 3 failed
      setTimeout(async () => {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/deep-scan/step4`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
            },
            body: JSON.stringify({ deep_scan_request_id })
          });
        } catch (triggerError) {
          console.error('Failed to trigger Step 4 after Step 3 error:', triggerError);
        }
      }, 1000);
      
      return NextResponse.json({
        success: true,
        message: 'Step 3 had errors but continuing with Step 4',
        request_id: deep_scan_request_id,
        step: 3,
        total_steps: 4,
        warnings: ['Subdomain analysis failed']
      });
    }

  } catch (error: any) {
    console.error('Step 3 error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function performSubdomainAnalysis(url: string) {
  try {
    console.log('🌐 Running subdomain scan for:', url);
    
    const domain = new URL(url).hostname.replace('www.', '');
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/subdomain-deep-scan`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ domain })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Subdomain scan failed: ${errorData.message || response.statusText}`);
    }

    const subdomainResults = await response.json();
    return subdomainResults;

  } catch (error) {
    console.error('Subdomain analysis failed:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to analyze subdomains',
      subdomains_found: []
    };
  }
} 