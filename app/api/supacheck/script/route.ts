import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Define the script content that will be injected into the client's website
  const scriptContent = `
    (function() {
      // Ensure we don't initialize multiple times
      if (window.__SUPACHECK_SCANNER) return;
      window.__SUPACHECK_SCANNER = true;
      
      // Error handling
      function logError(message, error) {
        console.error("[Supacheck] " + message, error);
      }
      
      // Create indicator function
      function createIndicator(found, details) {
        var results = details || { urls: [], keys: [], issues: [] };
        
        // Create widget container
        var widget = document.createElement('div');
        widget.style.position = 'fixed';
        widget.style.bottom = '20px';
        widget.style.right = '20px';
        widget.style.padding = '10px 15px';
        widget.style.borderRadius = '8px';
        widget.style.fontSize = '14px';
        widget.style.fontFamily = 'system-ui, -apple-system, sans-serif';
        widget.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.15)';
        widget.style.cursor = 'pointer';
        widget.style.zIndex = '999999';
        widget.style.transition = 'all 0.3s ease';
        widget.style.maxWidth = '300px';
        
        // Set appearance based on detection status
        if (found) {
          widget.style.backgroundColor = '#f0fdf4';
          widget.style.color = '#166534';
          widget.style.border = '1px solid #dcfce7';
          
          // Create header
          var header = document.createElement('div');
          header.style.display = 'flex';
          header.style.alignItems = 'center';
          header.style.justifyContent = 'space-between';
          header.style.marginBottom = '4px';
          
          var title = document.createElement('span');
          title.style.fontWeight = 'bold';
          title.textContent = 'Supabase Detected';
          header.appendChild(title);
          
          var count = document.createElement('span');
          count.style.backgroundColor = '#bbf7d0';
          count.style.color = '#166534';
          count.style.padding = '2px 6px';
          count.style.borderRadius = '9999px';
          count.style.fontSize = '12px';
          count.textContent = results.urls.length.toString();
          header.appendChild(count);
          
          widget.appendChild(header);
          
          // Create collapsible content (hidden by default)
          var content = document.createElement('div');
          content.style.display = 'none';
          content.style.marginTop = '8px';
          content.style.fontSize = '13px';
          
          if (results.urls.length > 0) {
            var urlsTitle = document.createElement('div');
            urlsTitle.style.fontWeight = 'bold';
            urlsTitle.style.marginBottom = '4px';
            urlsTitle.textContent = 'Detected endpoints:';
            content.appendChild(urlsTitle);
            
            var urlsList = document.createElement('ul');
            urlsList.style.margin = '0';
            urlsList.style.paddingLeft = '16px';
            
            for (var i = 0; i < results.urls.length; i++) {
              var listItem = document.createElement('li');
              listItem.textContent = results.urls[i];
              urlsList.appendChild(listItem);
            }
            
            content.appendChild(urlsList);
          }
          
          if (results.keys.length > 0) {
            var keysTitle = document.createElement('div');
            keysTitle.style.fontWeight = 'bold';
            keysTitle.style.marginTop = '8px';
            keysTitle.style.marginBottom = '4px';
            keysTitle.textContent = 'Potential API keys found:';
            content.appendChild(keysTitle);
            
            var keysList = document.createElement('ul');
            keysList.style.margin = '0';
            keysList.style.paddingLeft = '16px';
            keysList.style.color = '#b91c1c';
            
            for (var i = 0; i < results.keys.length; i++) {
              var keyItem = document.createElement('li');
              keyItem.textContent = results.keys[i].substring(0, 8) + '...';
              keysList.appendChild(keyItem);
            }
            
            content.appendChild(keysList);
          }
          
          if (results.issues.length > 0) {
            var issuesTitle = document.createElement('div');
            issuesTitle.style.fontWeight = 'bold';
            issuesTitle.style.marginTop = '8px';
            issuesTitle.style.marginBottom = '4px';
            issuesTitle.textContent = 'Potential issues:';
            content.appendChild(issuesTitle);
            
            var issuesList = document.createElement('ul');
            issuesList.style.margin = '0';
            issuesList.style.paddingLeft = '16px';
            issuesList.style.color = '#b91c1c';
            
            for (var i = 0; i < results.issues.length; i++) {
              var issueItem = document.createElement('li');
              issueItem.textContent = results.issues[i];
              issuesList.appendChild(issueItem);
            }
            
            content.appendChild(issuesList);
          }
          
          widget.appendChild(content);
          
          // Toggle content visibility on click
          widget.addEventListener('click', function() {
            var isHidden = content.style.display === 'none';
            content.style.display = isHidden ? 'block' : 'none';
            
            // Expand/collapse animation
            if (isHidden) {
              widget.style.opacity = '1';
              content.style.opacity = '0';
              content.style.maxHeight = '0';
              
              setTimeout(function() {
                content.style.transition = 'opacity 0.3s ease, max-height 0.3s ease';
                content.style.opacity = '1';
                content.style.maxHeight = '500px';
              }, 10);
            }
          });
        } else {
          widget.style.backgroundColor = '#f3f4f6';
          widget.style.color = '#374151';
          widget.style.border = '1px solid #e5e7eb';
          widget.textContent = 'No Supabase usage detected';
        }
        
        document.body.appendChild(widget);
      }
      
      // XHR helper function
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
      
      // Main scanner function
      function scanForSupabase() {
        try {
          var results = {
            urls: [],
            keys: [],
            issues: []
          };
          
          // Pattern to match <hash>.supabase.co
          var supabaseUrlPattern = /[a-zA-Z0-9\\-_]+\\.supabase\\.co/g;
          
          // Pattern to match potential Supabase keys (anon and service_role)
          var supabaseKeyPattern = /eyJ[a-zA-Z0-9_\\-\\.]+/g;
          
          // Check <script> tags
          var scripts = document.querySelectorAll('script');
          for (var i = 0; i < scripts.length; i++) {
            // Check inline content
            var content = scripts[i].textContent || '';
            
            // Check for Supabase URLs
            var urlMatches = content.match(supabaseUrlPattern);
            if (urlMatches) {
              for (var j = 0; j < urlMatches.length; j++) {
                if (results.urls.indexOf(urlMatches[j]) === -1) {
                  results.urls.push(urlMatches[j]);
                }
              }
            }
            
            // Check for potential API keys
            var keyMatches = content.match(supabaseKeyPattern);
            if (keyMatches) {
              for (var j = 0; j < keyMatches.length; j++) {
                if (results.keys.indexOf(keyMatches[j]) === -1) {
                  results.keys.push(keyMatches[j]);
                  
                  // Mark as potential issue
                  if (results.issues.indexOf('Potentially exposed API key') === -1) {
                    results.issues.push('Potentially exposed API key');
                  }
                }
              }
            }
            
            // Check if using createClient from Supabase
            if (content.includes('createClient') && 
                (content.includes('supabase') || content.includes('Supabase'))) {
              // Add to issues if not already added
              if (results.issues.indexOf('Supabase client identified') === -1) {
                results.issues.push('Supabase client identified');
              }
            }
            
            // Check external scripts
            var src = scripts[i].getAttribute('src');
            if (src && src.endsWith('.js')) {
              fetchContent(src, function(content) {
                // Check for Supabase URLs
                var urlMatches = content.match(supabaseUrlPattern);
                if (urlMatches) {
                  var updated = false;
                  for (var j = 0; j < urlMatches.length; j++) {
                    if (results.urls.indexOf(urlMatches[j]) === -1) {
                      results.urls.push(urlMatches[j]);
                      updated = true;
                    }
                  }
                  if (updated) {
                    createIndicator(true, results);
                  }
                }
                
                // Check for potential API keys
                var keyMatches = content.match(supabaseKeyPattern);
                if (keyMatches) {
                  var updated = false;
                  for (var j = 0; j < keyMatches.length; j++) {
                    if (results.keys.indexOf(keyMatches[j]) === -1) {
                      results.keys.push(keyMatches[j]);
                      updated = true;
                      
                      // Mark as potential issue
                      if (results.issues.indexOf('Potentially exposed API key') === -1) {
                        results.issues.push('Potentially exposed API key');
                      }
                    }
                  }
                  if (updated) {
                    createIndicator(true, results);
                  }
                }
              });
            }
          }
          
          // Also check the current page HTML for common signs of Supabase integration
          var html = document.documentElement.innerHTML;
          
          if (html.includes('supabase') || html.includes('Supabase')) {
            if (results.issues.indexOf('Potential Supabase usage detected in HTML') === -1) {
              results.issues.push('Potential Supabase usage detected in HTML');
            }
          }
          
          // Show initial results (may be updated later by async callbacks)
          setTimeout(function() {
            createIndicator(
              results.urls.length > 0 || results.keys.length > 0 || results.issues.length > 0, 
              results
            );
          }, 1000);
        } catch (err) {
          logError("Error scanning for Supabase:", err);
          createIndicator(false, {urls: [], keys: [], issues: []});
        }
      }
      
      // Start scanning with a small delay to ensure DOM is loaded
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
          setTimeout(scanForSupabase, 500);
        });
      } else {
        setTimeout(scanForSupabase, 500);
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