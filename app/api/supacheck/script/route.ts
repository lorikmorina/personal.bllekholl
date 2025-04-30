import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

export async function GET(request: NextRequest) {
  try {
    // Construct the path to the script file within the public directory
    const filePath = path.join(process.cwd(), 'public', 'scripts', 'supacheck-scanner.js');
    
    // Read the file content
    const scriptContent = await fs.readFile(filePath, 'utf-8');
    
    // Return the script content with the correct Content-Type
    return new NextResponse(scriptContent, {
      headers: {
        'Content-Type': 'application/javascript',
        // Allow caching - this is a static script
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });

  } catch (error) {
    console.error('[SupaCheck API] Error reading scanner script:', error);
    // Return an error response if the file can't be read
    return new NextResponse('// Error loading SupaCheck scanner script.', {
      status: 500, 
      headers: {
         'Content-Type': 'application/javascript',
         'Cache-Control': 'no-store, max-age=0',
       }
    });
  }
} 