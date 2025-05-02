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

// --- Function to Generate Error Widget Script ---
const createErrorWidgetScript = (message: string): string => {
  // Simple HTML/CSS for the error widget
  const widgetHTML = `
    <div id="supacheck-error-widget" style="position: fixed; bottom: 20px; right: 20px; width: 280px; background: #FFFBEB; border: 1px solid #FBBF24; border-left: 4px solid #F59E0B; border-radius: 6px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); font-family: sans-serif; z-index: 9998; padding: 12px; color: #92400E; font-size: 13px; line-height: 1.4;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
        <strong style="color: #B45309;">Supacheck Error</strong>
        <button onclick="document.getElementById('supacheck-error-widget').remove();" style="background: none; border: none; font-size: 18px; cursor: pointer; color: #B45309; padding: 0 4px;">&times;</button>
      </div>
      <p>${message.replace(/\"/g, '\\"').replace(/`/g, '\\`')}</p> 
      <p style="margin-top: 8px; font-size: 11px; color: #B45309;">Check console/dashboard for details.</p>
    </div>
  `;

  // JavaScript to inject the widget
  return `
    (function() {
      // Remove existing error widget if present
      var existingWidget = document.getElementById('supacheck-error-widget');
      if (existingWidget) existingWidget.remove();
      
      // Create and inject the new widget
      var errorDiv = document.createElement('div');
      errorDiv.innerHTML = \`${widgetHTML.replace(/`/g, '\\`')}\`; // Escape backticks in HTML string
      document.body.appendChild(errorDiv.firstElementChild);
      console.error(\`Supacheck Error: ${message.replace(/`/g, '\\`')}\`);\n    })();
  `;
};
// --- End Error Widget Function ---

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  // Get origin from headers (more reliable than referer)
  const origin = request.headers.get('Origin'); 
  // Fallback to Referer if Origin is null (less common for cross-origin script requests)
  const referer = request.headers.get('Referer'); 
  const requestDomain = normalizeDomain(origin || referer);
  const errorHeaders = { 
    'Content-Type': 'application/javascript', 
    'Access-Control-Allow-Origin': '*', // Allow all origins to display the error
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
  };

  // --- Authorization Checks ---
  if (!userId) {
    console.warn('Supacheck Script: Missing userId parameter.');
    const message = "Missing user identification in script URL.";
    return new NextResponse(createErrorWidgetScript(message), { status: 400, headers: errorHeaders });
  }

  if (!requestDomain) {
    console.warn(`Supacheck Script (User: ${userId}): Missing or invalid Origin/Referer header.`);
    const message = "Could not verify request origin. Ensure the script is loaded from a valid webpage.";
    return new NextResponse(createErrorWidgetScript(message), { status: 403, headers: errorHeaders });
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
      const message = "Failed to verify user due to a server error.";
      return new NextResponse(createErrorWidgetScript(message), { status: 500, headers: errorHeaders });
    }

    if (!profile) {
      console.warn(`Supacheck Script (User: ${userId}): Profile not found.`);
      const message = "User profile not found. Ensure the userId is correct.";
      return new NextResponse(createErrorWidgetScript(message), { status: 404, headers: errorHeaders });
    }

    // --- Verification Logic ---
    const registeredDomain = normalizeDomain(profile.main_website);
    const hasPremiumPlan = profile.subscription_plan === 'monthly' || profile.subscription_plan === 'yearly';
    // Add check for active status, adjust 'active' string if needed
    const isActive = profile.subscription_status === 'active'; 

    if (requestDomain !== registeredDomain) {
      console.warn(`Supacheck Script (User: ${userId}): Request domain '${requestDomain}' does not match registered domain '${registeredDomain}'.`);
      const message = `Request domain ('${requestDomain}') does not match the registered domain ('${registeredDomain || 'not set'}').`;
      return new NextResponse(createErrorWidgetScript(message), { status: 403, headers: errorHeaders });
    }

    if (!hasPremiumPlan || !isActive) {
       console.warn(`Supacheck Script (User: ${userId}): Access denied. Plan: ${profile.subscription_plan}, Status: ${profile.subscription_status}.`);
       const message = `Access denied. Current subscription plan ('${profile.subscription_plan || 'N/A'}') or status ('${profile.subscription_status || 'N/A'}') is not sufficient.`;
      return new NextResponse(createErrorWidgetScript(message), { status: 403, headers: errorHeaders });
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
    
    // Return the main script with appropriate headers
    return new NextResponse(scriptContent, {
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Access-Control-Allow-Origin': origin || '*', // Allow the specific verified origin
        'Cross-Origin-Resource-Policy': 'cross-origin',
      },
    });
  } catch (error: any) { // Catch all errors during the auth/serve process
    console.error(`Supacheck Script (User: ${userId}): Unexpected error serving script:`, error);
    const message = 'An internal server error occurred. Please try again later.';
    return new NextResponse(createErrorWidgetScript(message), { status: 500, headers: errorHeaders });
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