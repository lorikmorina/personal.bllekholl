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
  // Using IIFE with named function for better error stacktraces
  const scriptContent = `
    (function SupacheckScanner() {
      // Use a more unique namespace to avoid collisions
      if (window.__SUPACHECK_SCANNER_${id}) return;
      window.__SUPACHECK_SCANNER_${id} = true;
      
      // Config object with script ID
      var config = {
        scriptId: "${id}",
        apiEndpoint: "${process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin}/api/supacheck/verify"
      };
      
      // Error handling function
      function logError(message, error) {
        console.error("[Supacheck] " + message, error);
      }
      
      try {
        // Create a minimal floating indicator - using function declaration for better compatibility
        function createIndicator(found, urls) {
          urls = urls || [];
          var indicator = document.createElement('div');
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
            
            // Show details on click - using function for compatibility
            indicator.addEventListener('click', function() {
              alert('Supabase URLs found:\\n\\n' + urls.join('\\n'));
            });
          } else {
            indicator.style.backgroundColor = '#f3f4f6';
            indicator.style.color = '#374151';
            indicator.style.border = '1px solid #e5e7eb';
            indicator.textContent = 'No Supabase links found';
          }
          
          document.body.appendChild(indicator);
        }
        
        // Function to find Supabase links in JS files
        function findSupabaseLinks() {
          // Pattern to match <hash>.supabase.co
          var supabasePattern = /[a-zA-Z0-9-_]+\\.supabase\\.co/g;
          var foundUrls = [];
          
          // 1. Scan all script tags on the page
          function scanScriptTags() {
            try {
              var scripts = document.querySelectorAll('script');
              for (var i = 0; i < scripts.length; i++) {
                var script = scripts[i];
                // Check script content
                var content = script.textContent || '';
                var matches = content.match(supabasePattern);
                if (matches) {
                  for (var j = 0; j < matches.length; j++) {
                    // Add to array if not already there
                    if (foundUrls.indexOf(matches[j]) === -1) {
                      foundUrls.push(matches[j]);
                    }
                  }
                }
                
                // Check script src if it's pointing to a JavaScript file
                var src = script.getAttribute('src');
                if (src && src.endsWith('.js')) {
                  fetchAndScanExternalJS(src);
                }
              }
            } catch (err) {
              logError("Error scanning script tags:", err);
            }
          }
          
          // 2. Fetch and scan external JS files
          function fetchAndScanExternalJS(url) {
            try {
              var xhr = new XMLHttpRequest();
              xhr.open('GET', url, true);
              xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                  if (xhr.status === 200) {
                    var content = xhr.responseText;
                    var matches = content.match(supabasePattern);
                    if (matches) {
                      for (var j = 0; j < matches.length; j++) {
                        // Add to array if not already there
                        if (foundUrls.indexOf(matches[j]) === -1) {
                          foundUrls.push(matches[j]);
                        }
                      }
                    }
                  }
                }
              };
              xhr.send();
            } catch (err) {
              // Silently fail for external resources
            }
          }
          
          // 3. Find dynamically loaded scripts by looking at all links on the page
          function scanForJSLinks() {
            try {
              var links = document.querySelectorAll('a[href], link[href]');
              for (var i = 0; i < links.length; i++) {
                var link = links[i];
                var href = link.getAttribute('href');
                if (href && href.endsWith('.js')) {
                  fetchAndScanExternalJS(href);
                }
              }
            } catch (err) {
              logError("Error scanning for JS links:", err);
            }
          }
          
          // Run all the scanners
          scanScriptTags();
          scanForJSLinks();
          
          // After a delay to allow async operations to complete, show results
          setTimeout(function() {
            createIndicator(foundUrls.length > 0, foundUrls);
          }, 2000);
        }
        
        // Start the detection process with a small delay to ensure DOM is ready
        setTimeout(function() {
          findSupabaseLinks();
        }, 500);
      } catch (err) {
        logError("Critical initialization error:", err);
      }
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