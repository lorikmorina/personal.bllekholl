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
  // The key change is to avoid nested function definitions with var declarations
  const scriptContent = `
    (function() {
      // Ensure we don't initialize multiple times
      if (window.__SUPACHECK_SCANNER_${id}) return;
      window.__SUPACHECK_SCANNER_${id} = true;
      
      // Error handling - define at top level to avoid nesting issues
      function logError(message, error) {
        console.error("[Supacheck] " + message, error);
      }
      
      // Create indicator function - defined at top level
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
      
      // XHR helper function - defined at top level
      function fetchContent(url, callback) {
        try {
          var xhr = new XMLHttpRequest();
          xhr.open('GET', url, true);
          xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
              if (xhr.status === 200) {
                callback(xhr.responseText);
              }
            }
          };
          xhr.send();
        } catch (err) {
          // Silently fail
        }
      }
      
      // Main scanner function - now all helper functions are defined before use
      function scanForSupabaseLinks() {
        try {
          // Pattern to match <hash>.supabase.co - using single backslash and properly escaped
          var supabasePattern = /[a-zA-Z0-9\-_]+\.supabase\.co/g;
          var foundUrls = [];
          
          // Get all script tags
          var scripts = document.querySelectorAll('script');
          for (var i = 0; i < scripts.length; i++) {
            // Check inline content
            var content = scripts[i].textContent || '';
            var matches = content.match(supabasePattern);
            if (matches) {
              for (var j = 0; j < matches.length; j++) {
                if (foundUrls.indexOf(matches[j]) === -1) {
                  foundUrls.push(matches[j]);
                }
              }
            }
            
            // Check external scripts
            var src = scripts[i].getAttribute('src');
            if (src && src.endsWith('.js')) {
              // Use a closure to handle the async XHR properly
              (function(scriptSrc) {
                fetchContent(scriptSrc, function(content) {
                  var matches = content.match(supabasePattern);
                  if (matches) {
                    for (var j = 0; j < matches.length; j++) {
                      if (foundUrls.indexOf(matches[j]) === -1) {
                        foundUrls.push(matches[j]);
                        // Update UI immediately when new URL is found
                        createIndicator(true, foundUrls);
                      }
                    }
                  }
                });
              })(src);
            }
          }
          
          // Get all JS links
          var links = document.querySelectorAll('a[href], link[href]');
          for (var i = 0; i < links.length; i++) {
            var href = links[i].getAttribute('href');
            if (href && href.endsWith('.js')) {
              // Use a closure to handle the async XHR properly
              (function(linkHref) {
                fetchContent(linkHref, function(content) {
                  var matches = content.match(supabasePattern);
                  if (matches) {
                    for (var j = 0; j < matches.length; j++) {
                      if (foundUrls.indexOf(matches[j]) === -1) {
                        foundUrls.push(matches[j]);
                        // Update UI immediately when new URL is found
                        createIndicator(true, foundUrls);
                      }
                    }
                  }
                });
              })(href);
            }
          }
          
          // Show initial results (may be updated later by async callbacks)
          setTimeout(function() {
            createIndicator(foundUrls.length > 0, foundUrls);
          }, 1000);
        } catch (err) {
          logError("Error scanning for Supabase links:", err);
          // Show error indicator
          createIndicator(false, []);
        }
      }
      
      // Start scanning with a small delay
      setTimeout(scanForSupabaseLinks, 500);
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