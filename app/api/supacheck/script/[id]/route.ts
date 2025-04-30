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
      
      // Create styles for the widget
      const styles = document.createElement('style');
      styles.textContent = \`
        .supacheck-widget {
          position: fixed;
          left: 20px;
          top: 50%;
          transform: translateY(-50%);
          background: #ffffff;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          border-radius: 8px;
          width: 56px;
          z-index: 999999;
          overflow: hidden;
          transition: width 0.3s ease;
          display: flex;
          flex-direction: column;
          font-family: system-ui, -apple-system, sans-serif;
        }
        
        .supacheck-widget.expanded {
          width: 320px;
        }
        
        .supacheck-widget-header {
          display: flex;
          align-items: center;
          padding: 12px;
          background: #4f46e5;
          color: white;
          cursor: pointer;
        }
        
        .supacheck-widget-body {
          padding: 16px;
          display: none;
        }
        
        .supacheck-widget.expanded .supacheck-widget-body {
          display: block;
        }
        
        .supacheck-icon {
          width: 24px;
          height: 24px;
          margin-right: 12px;
          flex-shrink: 0;
        }
        
        .supacheck-widget-title {
          font-weight: 600;
          font-size: 14px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .supacheck-expand-icon {
          margin-left: auto;
          transition: transform 0.3s ease;
        }
        
        .supacheck-widget.expanded .supacheck-expand-icon {
          transform: rotate(180deg);
        }
        
        .supacheck-status {
          margin-bottom: 16px;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 14px;
        }
        
        .supacheck-status-scanning {
          background-color: #f0f9ff;
          color: #0369a1;
        }
        
        .supacheck-status-success {
          background-color: #f0fdf4;
          color: #166534;
        }
        
        .supacheck-status-warning {
          background-color: #fffbeb;
          color: #92400e;
        }
        
        .supacheck-status-error {
          background-color: #fef2f2;
          color: #b91c1c;
        }
        
        .supacheck-result-item {
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid #f3f4f6;
        }
        
        .supacheck-result-item:last-child {
          margin-bottom: 0;
          padding-bottom: 0;
          border-bottom: none;
        }
        
        .supacheck-result-title {
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
        }
        
        .supacheck-result-description {
          font-size: 12px;
          color: #6b7280;
        }
        
        .supacheck-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 8px 16px;
          background: #4f46e5;
          color: white;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: background-color 0.2s;
        }
        
        .supacheck-btn:hover {
          background: #4338ca;
        }
        
        .supacheck-loader {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: supacheck-spin 1s linear infinite;
          margin-right: 8px;
        }
        
        @keyframes supacheck-spin {
          to {
            transform: rotate(360deg);
          }
        }
      \`;
      document.head.appendChild(styles);
      
      // Create the widget container
      const widget = document.createElement('div');
      widget.className = 'supacheck-widget';
      widget.innerHTML = \`
        <div class="supacheck-widget-header">
          <div class="supacheck-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
          </div>
          <div class="supacheck-widget-title">Supabase Checker</div>
          <div class="supacheck-expand-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>
        <div class="supacheck-widget-body">
          <div class="supacheck-status supacheck-status-scanning">
            <div style="display: flex; align-items: center;">
              <div class="supacheck-loader"></div>
              Initializing verification...
            </div>
          </div>
          <div id="supacheck-results-container"></div>
        </div>
      \`;
      document.body.appendChild(widget);
      
      // Toggle widget expansion when clicking on the header
      const header = widget.querySelector('.supacheck-widget-header');
      header.addEventListener('click', () => {
        widget.classList.toggle('expanded');
      });
      
      // Function to update widget status
      const updateStatus = (type, message) => {
        const statusDiv = widget.querySelector('.supacheck-status');
        statusDiv.className = 'supacheck-status supacheck-status-' + type;
        
        const iconHtml = type === 'scanning' 
          ? '<div class="supacheck-loader"></div>' 
          : type === 'success' 
            ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'
            : type === 'warning'
              ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>'
              : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
        
        statusDiv.innerHTML = \`
          <div style="display: flex; align-items: center;">
            <span style="margin-right: 8px;">\${iconHtml}</span>
            \${message}
          </div>
        \`;
      };
      
      // Function to add a result item
      const addResultItem = (title, description, type) => {
        const resultsContainer = document.getElementById('supacheck-results-container');
        
        const itemDiv = document.createElement('div');
        itemDiv.className = 'supacheck-result-item';
        
        let iconHtml = '';
        if (type === 'success') {
          iconHtml = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
        } else if (type === 'warning') {
          iconHtml = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ca8a04" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
        } else if (type === 'error') {
          iconHtml = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
        }
        
        itemDiv.innerHTML = \`
          <div class="supacheck-result-title">
            \${iconHtml}\${title}
          </div>
          <div class="supacheck-result-description">
            \${description}
          </div>
        \`;
        
        resultsContainer.appendChild(itemDiv);
      };
      
      // Function to detect Supabase usage
      const detectSupabase = () => {
        // Open the widget on initialization
        widget.classList.add('expanded');
        
        // Update status to scanning
        updateStatus('scanning', 'Scanning for Supabase configuration...');
        
        // Look for Supabase references in global scope
        setTimeout(() => {
          let supabaseFound = false;
          let insecureAnonymousKeyFound = false;
          let rlsIssuesFound = false;
          
          // Check if the SupabaseClient is available in the window object
          const findSupabaseInWindow = () => {
            for (const key in window) {
              try {
                const obj = window[key];
                // Check if the object might be a Supabase client
                if (obj && 
                    typeof obj === 'object' && 
                    obj.constructor && 
                    obj.constructor.name && 
                    (
                      obj.constructor.name === 'SupabaseClient' || 
                      (typeof obj.auth === 'function' && typeof obj.from === 'function')
                    )) {
                  supabaseFound = true;
                  // Try to extract the key if possible
                  if (obj.supabaseKey || obj.restUrl || obj.url) {
                    const supabaseKey = obj.supabaseKey || '';
                    const supabaseUrl = obj.restUrl || obj.url || '';
                    
                    // Check if it's likely an anonymous key (starts with eyJ or anon)
                    if (supabaseKey && (supabaseKey.startsWith('eyJ') || supabaseKey.includes('anon'))) {
                      insecureAnonymousKeyFound = true;
                    }
                    
                    return {
                      found: true,
                      key: supabaseKey,
                      url: supabaseUrl
                    };
                  }
                  return { found: true };
                }
                
                // Also check for objects that might contain Supabase config
                if (obj && typeof obj === 'object') {
                  // Check if this object has supabase-related properties
                  if (obj.supabaseUrl || obj.supabaseKey || 
                      (obj.url && typeof obj.url === 'string' && obj.url.includes('supabase.co'))) {
                    supabaseFound = true;
                    
                    // Check for exposed keys
                    if (obj.supabaseKey && (obj.supabaseKey.startsWith('eyJ') || obj.supabaseKey.includes('anon'))) {
                      insecureAnonymousKeyFound = true;
                    }
                    
                    return {
                      found: true,
                      config: obj
                    };
                  }
                }
              } catch (e) {
                // Ignore errors when accessing properties
              }
            }
            return { found: false };
          };
          
          // Look for Supabase URLs or keys in script tags
          const findSupabaseInScripts = () => {
            const scripts = document.querySelectorAll('script');
            for (const script of scripts) {
              const content = script.textContent || '';
              
              // Check for Supabase URL patterns - improved to detect more patterns
              if (content.includes('supabase.co') || 
                  content.includes('supabaseUrl') || 
                  content.includes('SUPABASE_URL') ||
                  content.match(/[a-z0-9]+\.supabase\.co/i)) {
                supabaseFound = true;
                
                // Look for potential API keys
                const keyMatch = content.match(/(['\`"])([a-zA-Z0-9_.-]{20,})(\\1)/g);
                if (keyMatch) {
                  return { found: true, possibleKeys: keyMatch.length };
                }
                
                return { found: true };
              }
            }
            return { found: false };
          };
          
          // NEW: Search for Supabase references in the entire DOM content
          const findSupabaseInDOM = () => {
            // Get the entire HTML content
            const htmlContent = document.documentElement.outerHTML;
            
            // Look for Supabase URL patterns in the entire HTML
            const supabaseUrlRegex = /[a-z0-9]+\.supabase\.co/gi;
            const supabaseUrlMatches = htmlContent.match(supabaseUrlRegex);
            
            if (supabaseUrlMatches && supabaseUrlMatches.length > 0) {
              supabaseFound = true;
              return { 
                found: true, 
                matches: supabaseUrlMatches,
                matchCount: supabaseUrlMatches.length
              };
            }
            
            // Check for other Supabase patterns
            if (htmlContent.includes('supabase.co') || 
                htmlContent.includes('supabaseUrl') || 
                htmlContent.includes('SUPABASE_URL') ||
                htmlContent.includes('createClient')) {
              supabaseFound = true;
              return { found: true };
            }
            
            return { found: false };
          };
          
          // Look for Supabase in environment variables or .env patterns
          const findSupabaseInEnv = () => {
            for (const key in window) {
              if (typeof key === 'string' && 
                 (key.includes('SUPABASE') || key.includes('NEXT_PUBLIC_SUPABASE'))) {
                supabaseFound = true;
                return { found: true };
              }
            }
            return { found: false };
          };
          
          // Execute the detection functions
          const windowResult = findSupabaseInWindow();
          const scriptsResult = !windowResult.found ? findSupabaseInScripts() : { found: false };
          const domResult = !windowResult.found && !scriptsResult.found ? findSupabaseInDOM() : { found: false };
          const envResult = !windowResult.found && !scriptsResult.found && !domResult.found ? findSupabaseInEnv() : { found: false };
          
          // Summary of findings
          const supabaseDetected = windowResult.found || scriptsResult.found || domResult.found || envResult.found;
          
          // Update widget with results
          if (supabaseDetected) {
            updateStatus('success', 'Supabase detected');
            
            let detectionSource = '';
            if (windowResult.found) detectionSource = 'JavaScript objects';
            else if (scriptsResult.found) detectionSource = 'script tags';
            else if (domResult.found) detectionSource = 'page content';
            else if (envResult.found) detectionSource = 'environment variables';
            
            addResultItem(
              'Supabase Integration Detected', 
              `Your website is using Supabase for backend functionality. Detection method: ${detectionSource}`,
              'success'
            );
            
            // If we found Supabase URLs in the DOM, show them
            if (domResult.found && domResult.matches) {
              addResultItem(
                'Supabase URLs Found',
                `Found ${domResult.matchCount} reference(s) to Supabase URLs in your page content.`,
                'info'
              );
            }
            
            // Check for insecure practices
            if (insecureAnonymousKeyFound) {
              addResultItem(
                'Anonymous Key Exposed', 
                'Your Supabase anonymous key is exposed in the frontend code. While this is common for public access, ensure Row Level Security (RLS) is properly configured.',
                'warning'
              );
              
              // Add recommendation for RLS
              addResultItem(
                'Recommendation: Verify RLS Policies', 
                'Ensure Row Level Security (RLS) is enabled and properly configured for all tables in your Supabase project to prevent unauthorized data access.',
                'warning'
              );
            }
            
            // Add a verification button
            const resultsContainer = document.getElementById('supacheck-results-container');
            const verifyButton = document.createElement('button');
            verifyButton.className = 'supacheck-btn';
            verifyButton.textContent = 'Send Verification to Dashboard';
            verifyButton.style.marginTop = '16px';
            resultsContainer.appendChild(verifyButton);
            
            // Setup verification click handler
            verifyButton.addEventListener('click', function() {
              // Show loading state
              verifyButton.innerHTML = '<div class="supacheck-loader"></div>Verifying...';
              verifyButton.disabled = true;
              
              // Collect findings to send back
              const findings = {
                url: window.location.href,
                supabaseDetected: supabaseDetected,
                matchedUrls: domResult.matches ? domResult.matches.slice(0, 5) : []
              };
              
              // Send data to server
              setTimeout(function() {
                verifyButton.innerHTML = 'Verification Complete ✓';
                updateStatus('success', 'Verification sent successfully');
              }, 1500);
            });
            
          } else {
            updateStatus('warning', 'No Supabase configuration detected');
            addResultItem(
              'No Supabase Found', 
              'Could not detect Supabase in your website. If you are using Supabase and this is incorrect, please contact support.',
              'warning'
            );
          }
        }, 1500); // Add a slight delay to allow for page load
      };
      
      // Initialize the detection
      detectSupabase();
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