import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin Client (use environment variables)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper function to normalize domain names
const normalizeDomain = (url: string | null): string | null => {
  if (!url) return null;
  try {
    let domain = new URL(url).hostname;
    // Remove 'www.' if present
    domain = domain.replace(/^www\./, '');
    return domain;
  } catch (e) {
    // Handle cases where the input is not a valid URL (e.g., just a domain name)
    // Basic cleanup, remove potential protocols and 'www.'
    let domain = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
    // Remove potential paths
    domain = domain.split('/')[0]; 
    return domain || null; // Return cleaned domain or null if empty
  }
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  // Get origin from headers (more reliable than referer)
  const origin = request.headers.get('Origin'); 
  // Fallback to Referer if Origin is null (less common for cross-origin script requests)
  const referer = request.headers.get('Referer'); 
  const requestDomain = normalizeDomain(origin || referer);

  // --- Authorization Checks ---
  if (!userId) {
    console.warn('Supacheck Script: Missing userId parameter.');
    return new NextResponse('console.error("Supacheck Error: Missing user identification.");', { status: 400, headers: { 'Content-Type': 'application/javascript', 'Access-Control-Allow-Origin': '*' } });
  }

  if (!requestDomain) {
    console.warn(`Supacheck Script (User: ${userId}): Missing or invalid Origin/Referer header.`);
    // Potentially allow if origin/referer is missing in some valid cases? For now, let's block.
    return new NextResponse('console.error("Supacheck Error: Could not verify request origin.");', { status: 403, headers: { 'Content-Type': 'application/javascript', 'Access-Control-Allow-Origin': '*' } });
  }

  try {
    // Fetch user profile using Admin client
    const { data: profile, error } = await supabaseAdmin
      .from('profiles') // Assuming your table is named 'profiles'
      .select('main_website, subscription_plan, subscription_status')
      .eq('id', userId)
      .single();

    if (error) {
      console.error(`Supacheck Script (User: ${userId}): Error fetching profile:`, error.message);
      return new NextResponse('console.error("Supacheck Error: Failed to verify user.");', { status: 500, headers: { 'Content-Type': 'application/javascript', 'Access-Control-Allow-Origin': '*' } });
    }

    if (!profile) {
      console.warn(`Supacheck Script (User: ${userId}): Profile not found.`);
      return new NextResponse('console.error("Supacheck Error: User not found.");', { status: 404, headers: { 'Content-Type': 'application/javascript', 'Access-Control-Allow-Origin': '*' } });
    }

    // --- Verification Logic ---
    const registeredDomain = normalizeDomain(profile.main_website);
    const hasPremiumPlan = profile.subscription_plan === 'monthly' || profile.subscription_plan === 'yearly';
    // Add check for active status, adjust 'active' string if needed
    const isActive = profile.subscription_status === 'active'; 

    if (requestDomain !== registeredDomain) {
      console.warn(`Supacheck Script (User: ${userId}): Request domain '${requestDomain}' does not match registered domain '${registeredDomain}'.`);
      return new NextResponse(`console.error("Supacheck Error: Request origin mismatch.");`, { status: 403, headers: { 'Content-Type': 'application/javascript', 'Access-Control-Allow-Origin': '*' } });
    }

    if (!hasPremiumPlan || !isActive) {
       console.warn(`Supacheck Script (User: ${userId}): Access denied. Plan: ${profile.subscription_plan}, Status: ${profile.subscription_status}.`);
      return new NextResponse(`console.error("Supacheck Error: Access denied for current subscription plan/status.");`, { status: 403, headers: { 'Content-Type': 'application/javascript', 'Access-Control-Allow-Origin': '*' } });
    }
    
    // --- User Authorized: Serve the script ---
    console.log(`Supacheck Script (User: ${userId}): Authorized. Serving script to domain '${requestDomain}'.`);
    
    // Get the absolute path to the script file
    const scriptPath = path.join(process.cwd(), 'app/api/supacheck/script/supacheck-script.js');
    
    // Read the script file
    let scriptContent = await fs.readFile(scriptPath, 'utf-8');
    
    // Add version timestamp
    scriptContent = scriptContent.replace('// VERSION: Will be replaced dynamically', 
                                         `// VERSION: ${new Date().toISOString()}`);
    
    // Return the script with appropriate headers
    // Crucially, set the Allow-Origin to the *verified* requesting origin
    return new NextResponse(scriptContent, {
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Access-Control-Allow-Origin': origin || '*', // Use the verified Origin header
        'Cross-Origin-Resource-Policy': 'cross-origin', // Keep this for script integrity
        // Note: Allow-Methods/Headers are more relevant for the OPTIONS request below
      },
    });
  } catch (error: any) { // Catch all errors during the auth/serve process
    console.error(`Supacheck Script (User: ${userId}): Unexpected error serving script:`, error);
    return new NextResponse(
      `console.error('Supacheck Error: Internal server error.', ${JSON.stringify(String(error?.message || error))});`,
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/javascript',
          'Access-Control-Allow-Origin': '*' // Allow origin for error message display
        },
      }
    );
  }
}

export async function OPTIONS() {
  // Handle preflight requests
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*', // Allow any origin for preflight checks
      'Access-Control-Allow-Methods': 'GET, OPTIONS', // Allow GET method
      'Access-Control-Allow-Headers': 'Content-Type, Authorization', // Allow necessary headers
      'Access-Control-Max-Age': '86400', // Cache preflight response for 24 hours
    },
  });
} 