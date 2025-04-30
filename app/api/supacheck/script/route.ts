import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Get the absolute path to the script file
    const scriptPath = path.join(process.cwd(), 'app/api/supacheck/script/supacheck-script.js');
    
    // Read the script file
    let scriptContent = await fs.readFile(scriptPath, 'utf-8');
    
    // Add version timestamp
    scriptContent = scriptContent.replace('// VERSION: Will be replaced dynamically', 
                                         `// VERSION: ${new Date().toISOString()}`);
    
    // Return the script with appropriate headers
    return new NextResponse(scriptContent, {
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error serving script:', error);
    return new NextResponse(`console.error('Error loading Supabase check script: ${error}');`, {
      status: 500,
      headers: { 'Content-Type': 'application/javascript' },
    });
  }
} 