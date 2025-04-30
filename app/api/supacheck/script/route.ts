import { NextResponse } from 'next/server';

export async function GET() {
  // Create the JavaScript that will be injected into the client's website
  const scriptContent = `
    // Supabase Security Check Tool
    (function() {
      console.log('Supabase Security Check Tool initialized');
      
      // Create a container to display results
      function createWidget() {
        const container = document.createElement('div');
        container.id = 'supabase-check-widget';
        container.style.cssText = \`
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 300px;
          max-height: 400px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          z-index: 9999;
          overflow: hidden;
          transition: all 0.3s ease;
          color: #1a202c;
        \`;
        
        // Add header
        const header = document.createElement('div');
        header.style.cssText = \`
          padding: 10px 15px;
          background: #3182ce;
          color: white;
          font-weight: bold;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
        \`;
        header.textContent = 'Supabase Security Check';
        header.onclick = () => {
          const content = document.getElementById('supabase-check-content');
          content.style.display = content.style.display === 'none' ? 'block' : 'none';
        };
        
        const closeButton = document.createElement('span');
        closeButton.textContent = '×';
        closeButton.style.cssText = 'cursor: pointer; font-size: 18px;';
        closeButton.onclick = (e) => {
          e.stopPropagation();
          document.body.removeChild(container);
        };
        header.appendChild(closeButton);
        
        container.appendChild(header);
        
        // Add content container
        const content = document.createElement('div');
        content.id = 'supabase-check-content';
        content.style.cssText = \`
          padding: 15px;
          max-height: 350px;
          overflow-y: auto;
        \`;
        container.appendChild(content);
        
        document.body.appendChild(container);
        return content;
      }
      
      // Initialize content section
      const contentEl = createWidget();
      
      // Helper function to add findings to the widget
      function addFinding(title, details, type = 'info') {
        const findingEl = document.createElement('div');
        findingEl.style.cssText = \`
          margin-bottom: 10px;
          padding: 10px;
          border-radius: 4px;
          background: \${type === 'warning' ? '#FEF3C7' : type === 'error' ? '#FEE2E2' : '#EFF6FF'};
          border-left: 3px solid \${type === 'warning' ? '#F59E0B' : type === 'error' ? '#EF4444' : '#3B82F6'};
        \`;
        
        const titleEl = document.createElement('div');
        titleEl.textContent = title;
        titleEl.style.fontWeight = 'bold';
        findingEl.appendChild(titleEl);
        
        const detailsEl = document.createElement('div');
        detailsEl.style.marginTop = '5px';
        detailsEl.style.fontSize = '12px';
        
        if (typeof details === 'object') {
          detailsEl.style.fontFamily = 'monospace';
          detailsEl.textContent = JSON.stringify(details, null, 2);
        } else {
          detailsEl.textContent = details;
        }
        
        findingEl.appendChild(detailsEl);
        contentEl.appendChild(findingEl);
      }
      
      // Search for Supabase URLs and keys in scripts
      function findSupabaseCredentials() {
        let found = false;
        let supabaseUrl = null;
        let supabaseKey = null;
        
        // Check all scripts in the document
        const scripts = document.querySelectorAll('script');
        scripts.forEach(script => {
          if (script.textContent) {
            // Look for Supabase URL pattern (something.supabase.co)
            const urlMatch = script.textContent.match(/['"]https:\\/\\/([a-z0-9-]+)\\.supabase\\.co['"]/);
            if (urlMatch) {
              supabaseUrl = urlMatch[0].replace(/['"]/g, '');
              
              // Look for anon key nearby (typically starts with eyJ or sbp_)
              const keyMatch = script.textContent.match(/['"](?:eyJ|sbp_)[a-zA-Z0-9._-]{40,}['"]/);
              if (keyMatch) {
                supabaseKey = keyMatch[0].replace(/['"]/g, '');
                found = true;
                
                addFinding(
                  'Supabase Credentials Found', 
                  \`URL: \${supabaseUrl}\\nKey: \${supabaseKey.substring(0, 8)}...\`, 
                  'warning'
                );
              }
            }
          }
        });
        
        if (!found) {
          addFinding('Supabase Scan', 'No Supabase credentials found in inline scripts.', 'info');
        }
        
        return { supabaseUrl, supabaseKey };
      }
      
      // Check for network requests to Supabase
      function monitorSupabaseRequests(supabaseUrl) {
        if (!supabaseUrl) return;
        
        // Create a section for network requests
        addFinding('Network Monitoring', 'Monitoring requests to Supabase...', 'info');
        const requestsContainer = document.createElement('div');
        requestsContainer.id = 'supabase-requests';
        contentEl.appendChild(requestsContainer);
        
        // Intercept fetch requests to monitor Supabase API calls
        const originalFetch = window.fetch;
        window.fetch = async function(input, init) {
          // Call the original fetch
          const response = await originalFetch.apply(this, arguments);
          
          // Check if this is a Supabase request
          try {
            const url = (typeof input === 'string') ? input : input.url;
            if (url.includes(supabaseUrl.replace(/https:\\/\\//g, ''))) {
              // Clone the response so we can read its body
              const responseClone = response.clone();
              
              // Process the JSON response
              responseClone.json().then(data => {
                const requestEl = document.createElement('div');
                requestEl.style.cssText = \`
                  margin: 10px 0;
                  padding: 8px;
                  background: #f8fafc;
                  border-radius: 4px;
                  font-size: 12px;
                  border: 1px solid #e2e8f0;
                \`;
                
                // Add URL and method
                const headerEl = document.createElement('div');
                headerEl.style.cssText = \`
                  font-weight: bold;
                  margin-bottom: 5px;
                  word-break: break-all;
                \`;
                headerEl.textContent = \`\${init?.method || 'GET'} \${url}\`;
                requestEl.appendChild(headerEl);
                
                // Add the response data
                const bodyEl = document.createElement('pre');
                bodyEl.style.cssText = \`
                  margin: 0;
                  white-space: pre-wrap;
                  word-break: break-all;
                  max-height: 120px;
                  overflow-y: auto;
                  font-family: monospace;
                  font-size: 11px;
                \`;
                bodyEl.textContent = JSON.stringify(data, null, 2);
                requestEl.appendChild(bodyEl);
                
                // Add to the container
                const requestsContainer = document.getElementById('supabase-requests');
                if (requestsContainer) {
                  requestsContainer.appendChild(requestEl);
                }
              }).catch(e => {
                console.error('Error parsing Supabase response:', e);
              });
            }
          } catch (e) {
            console.error('Error in Supabase request monitoring:', e);
          }
          
          return response;
        };
      }
      
      // Main function to run all checks
      function runChecks() {
        // Add initial info
        addFinding('Supabase Security Check', 'Scanning page for Supabase usage...', 'info');
        
        // Look for Supabase credentials in page scripts
        const { supabaseUrl } = findSupabaseCredentials();
        
        // Monitor network requests if we found a Supabase URL
        if (supabaseUrl) {
          monitorSupabaseRequests(supabaseUrl);
        }
      }
      
      // Run all checks
      runChecks();
    })();
  `;

  // Set the appropriate headers for JavaScript content
  return new NextResponse(scriptContent, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
} 