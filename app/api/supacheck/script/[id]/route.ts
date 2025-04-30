import { NextRequest, NextResponse } from 'next/server';

// In a real application, you would check if the ID exists in your database
const validateScriptId = async (id: string): Promise<boolean> => {
  // For demo purposes, we'll consider any ID that starts with 'supacheck_' as valid
  return id.startsWith('supacheck_');
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  
  // Validate the script ID
  const isValid = await validateScriptId(id);
  if (!isValid) {
    return new NextResponse('Invalid script ID', { status: 404 });
  }
  
  // Define the script content that will be injected into the client's website
  const scriptContent = `
    (function() {
      // Ensure we don't initialize multiple times
      if (window.__SUPACHECK_INITIALIZED__) return;
      window.__SUPACHECK_INITIALIZED__ = true;
      
      // Configuration with script ID
      const config = {
        scriptId: "${id}",
        apiEndpoint: "${process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin}/api/supacheck/verify",
      };
      
      // Create a minimal floating indicator
      const createIndicator = (found, urls = []) => {
        const indicator = document.createElement('div');
        indicator.style.position = 'fixed';
        indicator.style.bottom = '20px';
        indicator.style.right = '20px';
        indicator.style.padding = '10px 15px';
        indicator.style.borderRadius = '5px';
        indicator.style.fontSize = '14px';
        indicator.style.fontFamily = 'system-ui, -apple-system, sans-serif';
        indicator.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        indicator.style.cursor = 'pointer';
        indicator.style.zIndex = '999999';
        
        if (found) {
          indicator.style.backgroundColor = '#f0fdf4';
          indicator.style.color = '#166534';
          indicator.style.border = '1px solid #dcfce7';
          indicator.textContent = 'Supabase links found: ' + urls.length;
          
          // Show details on click
          indicator.addEventListener('click', () => {
            alert('Supabase URLs found:\\n\\n' + urls.join('\\n'));
          });
        } else {
          indicator.style.backgroundColor = '#f3f4f6';
          indicator.style.color = '#374151';
          indicator.style.border = '1px solid #e5e7eb';
          indicator.textContent = 'No Supabase links found';
        }
        
        document.body.appendChild(indicator);
      };
      
      // Function to find Supabase links in JS files
      const findSupabaseLinks = () => {
        // Pattern to match <hash>.supabase.co
        const supabasePattern = /[a-zA-Z0-9-_]+\.supabase\.co/g;
        const foundUrls = new Set();
        
        // 1. Scan all script tags on the page
        const scanScriptTags = () => {
          const scripts = document.querySelectorAll('script');
          scripts.forEach(script => {
            // Check script content
            const content = script.textContent || '';
            const matches = content.match(supabasePattern);
            if (matches) {
              matches.forEach(match => foundUrls.add(match));
            }
            
            // Check script src if it's pointing to a JavaScript file
            const src = script.getAttribute('src');
            if (src && src.endsWith('.js')) {
              fetchAndScanExternalJS(src);
            }
          });
        };
        
        // 2. Fetch and scan external JS files
        const fetchAndScanExternalJS = (url) => {
          fetch(url)
            .then(response => response.text())
            .then(content => {
              const matches = content.match(supabasePattern);
              if (matches) {
                matches.forEach(match => foundUrls.add(match));
              }
            })
            .catch(() => {
              // Ignore errors fetching external files
            });
        };
        
        // 3. Find dynamically loaded scripts by looking at all links on the page
        const scanForJSLinks = () => {
          const links = document.querySelectorAll('a[href], link[href]');
          links.forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.endsWith('.js')) {
              fetchAndScanExternalJS(href);
            }
          });
        };
        
        // Run all the scanners
        scanScriptTags();
        scanForJSLinks();
        
        // After a delay to allow async operations to complete, show results
        setTimeout(() => {
          const urlsArray = Array.from(foundUrls);
          createIndicator(urlsArray.length > 0, urlsArray);
        }, 2000);
      };
      
      // Start the detection process
      findSupabaseLinks();
    })();
  `;
  
  // Return the script content with the appropriate Content-Type
  return new NextResponse(scriptContent, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
} 