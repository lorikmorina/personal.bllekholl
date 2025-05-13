import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Get the absolute path to the CSS file
  const cssPath = path.join(process.cwd(), 'app/api/supacheck/script/supacheck-styles.css');
  
  try {
    // Read the CSS content
    const cssContent = await fs.readFile(cssPath, 'utf8');
    
    // Return the CSS with appropriate headers
    return new NextResponse(cssContent, {
      headers: {
        'Content-Type': 'text/css',
        'Cache-Control': 'public, max-age=31536000', // Cache for a year
        'Access-Control-Allow-Origin': '*', // Allow access from any origin
      },
    });
  } catch (error) {
    console.error('Error serving Supacheck styles:', error);
    return new NextResponse('/* Error loading styles */', {
      status: 500,
      headers: {
        'Content-Type': 'text/css',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

export async function OPTIONS() {
  // Handle preflight requests
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Max-Age': '86400', // Cache preflight response for 24 hours
    },
  });
} 