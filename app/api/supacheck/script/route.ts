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
      
      // Add a loading indicator
      function showLoading(message) {
        const loadingEl = document.createElement('div');
        loadingEl.id = 'supabase-check-loading';
        loadingEl.style.cssText = \`
          display: flex;
          align-items: center;
          margin-bottom: 10px;
          padding: 10px;
          background: #EFF6FF;
          border-radius: 4px;
        \`;
        
        const spinner = document.createElement('div');
        spinner.style.cssText = \`
          width: 16px;
          height: 16px;
          border: 2px solid #3B82F6;
          border-top-color: transparent;
          border-radius: 50%;
          margin-right: 10px;
          animation: spin 1s linear infinite;
        \`;
        
        // Add the keyframes for spinner
        if (!document.getElementById('spinner-keyframes')) {
          const style = document.createElement('style');
          style.id = 'spinner-keyframes';
          style.textContent = \`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          \`;
          document.head.appendChild(style);
        }
        
        const textEl = document.createElement('div');
        textEl.textContent = message;
        
        loadingEl.appendChild(spinner);
        loadingEl.appendChild(textEl);
        contentEl.appendChild(loadingEl);
        
        return loadingEl;
      }
      
      // Remove loading indicator
      function hideLoading() {
        const loadingEl = document.getElementById('supabase-check-loading');
        if (loadingEl) {
          loadingEl.remove();
        }
      }
      
      // Fetch and analyze external JS files
      async function fetchAndAnalyzeScripts() {
        // Find all script tags with src attribute
        const scriptTags = Array.from(document.querySelectorAll('script[src]'));
        const scriptUrls = scriptTags.map(script => {
          const src = script.getAttribute('src');
          if (src.startsWith('http')) {
            return src;
          } else if (src.startsWith('/')) {
            return \`\${window.location.origin}\${src}\`;
          } else {
            return \`\${window.location.origin}/\${src}\`;
          }
        });
        
        // Filter out URLs that are likely to be third-party scripts or not relevant
        const relevantScripts = scriptUrls.filter(url => {
          const skipPatterns = ['google', 'analytics', 'ga.js', 'gtag', 'facebook', 'fbevents', 'hotjar', 'clarity'];
          return !skipPatterns.some(pattern => url.includes(pattern));
        });
        
        if (relevantScripts.length === 0) {
          addFinding('Script Scan', 'No relevant external JavaScript files found to scan.', 'info');
          return { urls: [], contents: [] };
        }
        
        const loadingEl = showLoading(\`Scanning \${relevantScripts.length} JS files...\`);
        
        let scriptContents = [];
        
        // Fetch scripts with proper error handling and CORS consideration
        for (const url of relevantScripts) {
          try {
            const response = await fetch(url, { 
              // Use no-cors as a fallback, though it will limit content access
              mode: 'no-cors',
              credentials: 'omit'
            });
            
            // For no-cors responses, we won't be able to access the content directly
            // but we can still record that we tried to scan it
            if (response.type === 'opaque') {
              console.log('Cannot access content of script due to CORS policy:', url);
              scriptContents.push({
                url: url,
                content: null,
                error: 'CORS restriction'
              });
              continue;
            }
            
            const text = await response.text();
            scriptContents.push({
              url: url,
              content: text
            });
          } catch (error) {
            console.error('Error fetching script:', url, error);
            scriptContents.push({
              url: url,
              content: null,
              error: error.message
            });
          }
        }
        
        hideLoading();
        
        return {
          urls: relevantScripts,
          contents: scriptContents
        };
      }
      
      // Search for Supabase URLs and keys in all sources
      async function findSupabaseCredentials() {
        let found = false;
        let supabaseUrl = null;
        let supabaseKey = null;
        let foundInFile = null;
        
        // First check inline scripts
        addFinding('Script Scan', 'Scanning inline scripts...', 'info');
        
        const inlineScripts = document.querySelectorAll('script:not([src])');
        inlineScripts.forEach(script => {
          if (script.textContent) {
            // Look for Supabase URL and key in various formats
            checkScriptContent(script.textContent, 'Inline script');
          }
        });
        
        // Then check external scripts
        const { contents } = await fetchAndAnalyzeScripts();
        
        // Count accessible scripts
        const accessibleScripts = contents.filter(s => s.content !== null).length;
        const inaccessibleScripts = contents.filter(s => s.content === null).length;
        
        addFinding(
          'External Scripts', 
          \`Scanned \${accessibleScripts} external scripts.\${inaccessibleScripts > 0 ? \` \${inaccessibleScripts} scripts were inaccessible due to CORS restrictions.\` : ''}\`,
          'info'
        );
        
        // Check each accessible script
        for (const script of contents) {
          if (script.content) {
            checkScriptContent(script.content, script.url);
          }
        }
        
        function checkScriptContent(content, source) {
          // Pattern 1: Standard format with quotes
          // Example: "https://something.supabase.co"
          const urlMatches = content.match(/["']https:\/\/([a-z0-9-]+)\.supabase\.co[""]/g);
          
          // Pattern 2: Function parameter or object format
          // Example: supabaseUrl: e="https://something.supabase.co"
          // or anything with .supabase.co in a string-like context
          const urlMatches2 = content.match(/[=:]\s*["']https:\/\/([a-z0-9-]+)\.supabase\.co["']/g);
          
          // Pattern 3: Detect even without quotes by looking for URL pattern
          const urlMatches3 = content.match(/https:\/\/([a-z0-9-]+)\.supabase\.co/g);
          
          // Combine all URL matches
          const allUrlMatches = [
            ...(urlMatches || []),
            ...(urlMatches2 || []),
            ...(urlMatches3 || [])
          ];
          
          if (allUrlMatches.length > 0) {
            // Extract the first URL that matches our pattern
            let matchedUrl = allUrlMatches[0];
            
            // Clean the URL from any surrounding characters
            supabaseUrl = matchedUrl.match(/https:\/\/([a-z0-9-]+)\.supabase\.co/)[0];
            
            // Pattern 1: Look for anon key in standard format
            // Example: "eyJhbG..." or 'sbp_...'
            const keyMatches = content.match(/["'](?:eyJ[a-zA-Z0-9_.-]{20,}|sbp_[a-zA-Z0-9_.-]{20,})["']/g);
            
            // Pattern 2: Function parameter or object format
            // Example: supabaseKey: t="eyJhbG..."
            const keyMatches2 = content.match(/[=:]\s*["'](?:eyJ[a-zA-Z0-9_.-]{20,}|sbp_[a-zA-Z0-9_.-]{20,})["']/g);
            
            // Pattern 3: Detect even without quotes
            const keyMatches3 = content.match(/(?:eyJ[a-zA-Z0-9_.-]{40,}|sbp_[a-zA-Z0-9_.-]{40,})/g);
            
            // Combine all key matches
            const allKeyMatches = [
              ...(keyMatches || []),
              ...(keyMatches2 || []),
              ...(keyMatches3 || [])
            ];
            
            if (allKeyMatches.length > 0) {
              // Extract the first key that matches our pattern
              let matchedKey = allKeyMatches[0];
              
              // Clean the key from any surrounding characters
              let keyMatch;
              if (matchedKey.includes('eyJ')) {
                keyMatch = matchedKey.match(/eyJ[a-zA-Z0-9_.-]{20,}/);
              } else if (matchedKey.includes('sbp_')) {
                keyMatch = matchedKey.match(/sbp_[a-zA-Z0-9_.-]{20,}/);
              }
              
              if (keyMatch) {
                supabaseKey = keyMatch[0];
                found = true;
                foundInFile = source;
                
                addFinding(
                  'Supabase Credentials Found', 
                  \`Found in: \${typeof source === 'string' ? source : 'Inline script'}\\nURL: \${supabaseUrl}\\nKey: \${supabaseKey.substring(0, 8)}...\`, 
                  'warning'
                );
              }
            }
          }
        }
        
        if (!found) {
          addFinding('Supabase Scan Result', 'No Supabase credentials found in any scripts.', 'info');
        }
        
        return { supabaseUrl, supabaseKey, foundInFile };
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
        
        // Also intercept XMLHttpRequest for older code
        const originalXhrOpen = XMLHttpRequest.prototype.open;
        const originalXhrSend = XMLHttpRequest.prototype.send;
        
        XMLHttpRequest.prototype.open = function(method, url) {
          this._supaRequestUrl = url;
          this._supaRequestMethod = method;
          return originalXhrOpen.apply(this, arguments);
        };
        
        XMLHttpRequest.prototype.send = function() {
          if (this._supaRequestUrl && this._supaRequestUrl.includes(supabaseUrl.replace(/https:\\/\\//g, ''))) {
            const originalOnLoad = this.onload;
            this.onload = function() {
              try {
                const data = JSON.parse(this.responseText);
                
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
                headerEl.textContent = \`\${this._supaRequestMethod} \${this._supaRequestUrl}\`;
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
              } catch (e) {
                console.error('Error parsing Supabase XHR response:', e);
              }
              
              if (originalOnLoad) {
                originalOnLoad.apply(this, arguments);
              }
            };
          }
          
          return originalXhrSend.apply(this, arguments);
        };
      }
      
      // Main function to run all checks
      async function runChecks() {
        // Add initial info
        addFinding('Supabase Security Check', 'Scanning page for Supabase usage...', 'info');
        
        // Look for Supabase credentials in page scripts and external scripts
        const { supabaseUrl } = await findSupabaseCredentials();
        
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