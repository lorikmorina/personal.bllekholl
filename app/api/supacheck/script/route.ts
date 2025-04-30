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
      
      // Create widget container
      var widget;
      var isExpanded = false;
      var capturedRequests = [];
      var lastUserInfo = null;
      
      // Create indicator function
      function createIndicator(found, details) {
        var results = details || { url: null, key: null, issues: [] };
        
        console.log("[SupaCheck] Creating widget with status:", { 
          found: found, 
          urlFound: !!results.url,
          keyFound: !!results.key
        });
        
        // Remove existing widget if any
        var existingWidget = document.getElementById('supacheck-widget');
        if (existingWidget) {
          existingWidget.remove();
        }
        
        // Create widget container
        widget = document.createElement('div');
        widget.id = 'supacheck-widget';
        widget.style.position = 'fixed';
        widget.style.bottom = '20px';
        widget.style.right = '20px';
        widget.style.padding = '10px 15px';
        widget.style.borderRadius = '8px';
        widget.style.fontSize = '14px';
        widget.style.fontFamily = 'system-ui, -apple-system, sans-serif';
        widget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        widget.style.cursor = 'pointer';
        widget.style.zIndex = '999999';
        widget.style.transition = 'all 0.3s ease';
        widget.style.maxWidth = '300px';
        widget.style.backgroundColor = found ? '#f0fdf4' : '#fef2f2';
        widget.style.color = found ? '#166534' : '#b91c1c';
        widget.style.border = found ? '1px solid #dcfce7' : '1px solid #fecaca';
        widget.setAttribute('title', 'Click to expand Supabase detection details');
        
        // Create header
        var header = document.createElement('div');
        header.style.display = 'flex';
        header.style.alignItems = 'center';
        header.style.justifyContent = 'space-between';
        header.style.marginBottom = isExpanded ? '4px' : '0'; // Adjust margin based on expansion
        
        var title = document.createElement('span');
        title.style.fontWeight = 'bold';
        title.textContent = found ? 'Supabase Detected' : 'Supabase Not Found';
        header.appendChild(title);
        
        if (found) {
          var statusIcon = document.createElement('span');
          statusIcon.textContent = '✅';
          statusIcon.style.marginLeft = '8px';
          header.appendChild(statusIcon);
        }
        
        widget.appendChild(header);

        // Create tabs container (always create but hide if not expanded)
        var tabsContainer = document.createElement('div');
        tabsContainer.id = 'supacheck-tabs-container';
        tabsContainer.style.display = isExpanded ? 'block' : 'none';
        tabsContainer.style.marginTop = '10px';
        
        // Create tab headers
        var tabHeaders = document.createElement('div');
        tabHeaders.style.display = 'flex';
        tabHeaders.style.borderBottom = '1px solid rgba(0,0,0,0.1)';
        tabHeaders.style.marginBottom = '8px';
        
        var detectionTabHeader = createTabHeader('Detection', true);
        var requestsTabHeader = createTabHeader('Network', false);
        var userTabHeader = createTabHeader('User Info', false);
        
        tabHeaders.appendChild(detectionTabHeader);
        tabHeaders.appendChild(requestsTabHeader);
        tabHeaders.appendChild(userTabHeader);
        
        tabsContainer.appendChild(tabHeaders);
        
        // Create tab contents
        var detectionContent = document.createElement('div');
        detectionContent.className = 'supacheck-tab-content';
        detectionContent.setAttribute('data-tab', 'detection');
        detectionContent.style.display = 'block';
        
        var requestsContent = document.createElement('div');
        requestsContent.className = 'supacheck-tab-content';
        requestsContent.setAttribute('data-tab', 'network');
        requestsContent.style.display = 'none';
        requestsContent.id = 'supacheck-requests-list'; // Use this for requests
        requestsContent.style.fontSize = '12px';
        requestsContent.style.maxHeight = '200px';
        requestsContent.style.overflowY = 'auto';
        
        var userContent = document.createElement('div');
        userContent.className = 'supacheck-tab-content';
        userContent.setAttribute('data-tab', 'user info');
        userContent.style.display = 'none';
        userContent.id = 'supacheck-user-info-content'; // Use this for user info
        userContent.style.fontSize = '12px';
        userContent.style.maxHeight = '200px';
        userContent.style.overflowY = 'auto';
        
        // Initial Content Setup
        updateDetectionTab(); // Populate detection tab initially
        requestsContent.innerHTML = '<p style="font-size:12px; color:#666;"><i>Waiting for Auth token...</i></p>';
        userContent.innerHTML = '<p style="font-size:12px; color:#666;"><i>Waiting for profile fetch attempt...</i></p>';

        tabsContainer.appendChild(detectionContent);
        tabsContainer.appendChild(requestsContent);
        tabsContainer.appendChild(userContent);
        
        widget.appendChild(tabsContainer);
        
        // Toggle widget expansion on click
        widget.addEventListener('click', function(event) {
          // Prevent toggling if a tab header was clicked
          if (event.target.classList.contains('supacheck-tab-header')) {
             event.stopPropagation(); 
             return;
          }
          
          isExpanded = !isExpanded;
          tabsContainer.style.display = isExpanded ? 'block' : 'none';
          header.style.marginBottom = isExpanded ? '4px' : '0';
        });
        
        // Helper function to create tab header
        function createTabHeader(name, isActive) {
          var tab = document.createElement('div');
          tab.className = 'supacheck-tab-header';
          tab.setAttribute('data-tab', name.toLowerCase());
          tab.style.padding = '6px 10px';
          tab.style.cursor = 'pointer';
          tab.style.fontSize = '13px';
          tab.style.borderBottom = isActive ? '2px solid #166534' : 'none';
          tab.style.color = isActive ? '#166534' : '#6b7280'; // Muted color for inactive
          tab.style.fontWeight = isActive ? 'bold' : 'normal';
          tab.textContent = name;
          
          // Add click listener for tab switching
          tab.addEventListener('click', function(e) {
            switchTab(name.toLowerCase());
            e.stopPropagation(); // Prevent widget collapse
          });
          
          return tab;
        }
        
        // Function to switch between tabs
        function switchTab(tabName) {
          // Update tab headers appearance
          var headers = widget.querySelectorAll('.supacheck-tab-header');
          headers.forEach(function(h) {
            var isActive = h.getAttribute('data-tab') === tabName;
            h.style.borderBottom = isActive ? '2px solid #166534' : 'none';
            h.style.color = isActive ? '#166534' : '#6b7280';
            h.style.fontWeight = isActive ? 'bold' : 'normal';
          });
          
          // Update tab contents visibility
          var contents = widget.querySelectorAll('.supacheck-tab-content');
          contents.forEach(function(c) {
            c.style.display = c.getAttribute('data-tab') === tabName ? 'block' : 'none';
          });
        }
        
        document.body.appendChild(widget);
      }
      
      // Function to update requests tab (Simplified)
      function updateRequestsTab(request) {
        if (!widget) return;
        
        var requestsList = document.getElementById('supacheck-requests-list');
        if (!requestsList) return;
        
        requestsList.innerHTML = ''; // Clear previous content
        
        var item = document.createElement('div');
        item.style.padding = '4px 0';
        item.style.fontSize = '12px';
        
        var statusText = document.createElement('p');
        statusText.innerHTML = '✅ <b>Auth Token Captured:</b><br>';
        
        var tokenCode = document.createElement('code');
        tokenCode.style.wordBreak = 'break-all';
        tokenCode.style.color = '#555';
        tokenCode.textContent = request.authToken ? request.authToken.substring(0, 15) + '...' : 'Error';
        
        statusText.appendChild(tokenCode);
        item.appendChild(statusText);
        requestsList.appendChild(item);
      }
      
      // Function to update user info tab
      function updateUserInfoTab(userInfo, endpoint) {
        if (!widget) return;
        
        var userInfoContent = document.getElementById('supacheck-user-info-content');
        if (!userInfoContent) return;
        
        userInfoContent.innerHTML = ''; // Clear previous content

        if (userInfo) {
            var successMsg = document.createElement('p');
            successMsg.style.fontSize = '12px';
            successMsg.style.marginBottom = '4px';
            successMsg.innerHTML = '✅ Profile data fetched from <b>' + endpoint + '</b>:';
            userInfoContent.appendChild(successMsg);
            
            var userInfoPre = document.createElement('pre');
            userInfoPre.style.fontSize = '11px';
            userInfoPre.style.backgroundColor = 'rgba(0,0,0,0.05)';
            userInfoPre.style.padding = '8px';
            userInfoPre.style.borderRadius = '4px';
            userInfoPre.style.maxHeight = '150px';
            userInfoPre.style.overflowY = 'auto';
            userInfoPre.textContent = JSON.stringify(userInfo, null, 2);
            userInfoContent.appendChild(userInfoPre);
        } else {
            var failureMsg = document.createElement('p');
            failureMsg.style.fontSize = '12px';
            failureMsg.style.color = '#b91c1c';
            failureMsg.textContent = '❌ Failed to fetch profile data from common endpoints (/profiles, /users, /accounts).';
            userInfoContent.appendChild(failureMsg);
        }
      }
      
      // Helper function to extract endpoint from URL
      function extractEndpoint(url) {
        try {
          var urlObj = new URL(url);
          var path = urlObj.pathname;
          if (path.length > 30) {
            path = path.substring(0, 27) + '...';
          }
          return urlObj.hostname + path;
        } catch (e) {
          return url;
        }
      }
      
      // Helper function to format timestamp
      function formatTime(timestamp) {
        try {
          var date = new Date(timestamp);
          return date.toLocaleTimeString();
        } catch (e) {
          return timestamp;
        }
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
      
      // Network request monitoring
      function setupNetworkMonitoring(results) {
        var capturedAuthToken = null; // Store the captured bearer token
        var profileFetchAttempted = false; // Ensure we only try once

        // Function to attempt fetching profile data
        async function attemptProfileFetch() {
          if (!results.url || !capturedAuthToken || profileFetchAttempted) {
            return; // Need URL and token, and only try once
          }
          
          profileFetchAttempted = true;
          console.log("[SupaCheck] Attempting to fetch profile data...");
          
          var profileEndpoints = ['/rest/v1/profiles', '/rest/v1/users', '/rest/v1/accounts'];
          var foundProfileData = null;
          var foundEndpoint = null;

          for (var i = 0; i < profileEndpoints.length; i++) {
            var endpoint = profileEndpoints[i];
            var fetchUrl = 'https://' + results.url + endpoint + '?select=*';
            
            try {
              var response = await fetch(fetchUrl, {
                method: 'GET',
                headers: {
                  'Authorization': capturedAuthToken,
                  'apikey': results.key, // Use the detected anon key
                  'Accept': 'application/json'
                }
              });
              
              console.log("[SupaCheck] Profile fetch response for", endpoint, ":", response.status);
              
              if (response.ok) {
                var data = await response.json();
                console.log("[SupaCheck] Profile data found at", endpoint, ":", data);
                
                // Check if data is a non-empty array or an object with properties
                if ((Array.isArray(data) && data.length > 0) || (typeof data === 'object' && data !== null && Object.keys(data).length > 0)) {
                  foundProfileData = data;
                  foundEndpoint = endpoint;
                  break; // Found data, stop searching
                }
              } else {
                 // Log non-OK responses for debugging
                 var errorText = await response.text();
                 console.log("[SupaCheck] Profile fetch failed for", endpoint, ":", response.status, errorText);
              }
            } catch (err) {
              console.error("[SupaCheck] Error fetching profile data from", endpoint, ":", err);
            }
          }
          
          // Update the User Info tab
          updateUserInfoTab(foundProfileData, foundEndpoint);
        }

        // Check if fetch is available
        if (window.fetch) {
          // Store the original fetch
          var originalFetch = window.fetch;
          
          // Override fetch
          window.fetch = function(resource, options) {
            var url = (resource instanceof Request) ? resource.url : resource;
            var method = (resource instanceof Request) ? resource.method : (options && options.method) || 'GET';
            
            // Look for Authorization header only after initial detection
            if (initialDetectionComplete && !capturedAuthToken) {
              var headers = {};
              if (resource instanceof Request) {
                resource.headers.forEach(function(value, name) { headers[name] = value; });
              } else if (options && options.headers) {
                 if (options.headers instanceof Headers) {
                   options.headers.forEach(function(value, name) { headers[name] = value; });
                 } else {
                   headers = options.headers;
                 }
              }
              
              var authToken = headers.authorization || headers.Authorization;
              if (authToken && authToken.toLowerCase().startsWith('bearer ')) {
                console.log("[SupaCheck] Captured Authorization Bearer token.");
                capturedAuthToken = authToken;
                updateRequestsTab({ method: method, endpoint: url.toString(), timestamp: new Date().toISOString(), authToken: capturedAuthToken });
                // Attempt to fetch profile data now that we have the token
                attemptProfileFetch(); 
              }
            }
            
            // Always call the original fetch
            return originalFetch.apply(this, arguments);
          };
        }
        
        // Minimal XHR override just for capturing token
        if (window.XMLHttpRequest) {
          var originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
          
          XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
            if (initialDetectionComplete && !capturedAuthToken && name.toLowerCase() === 'authorization' && value.toLowerCase().startsWith('bearer ')) {
              console.log("[SupaCheck] Captured Authorization Bearer token (XHR).");
              capturedAuthToken = value;
               // Note: Can't easily get method/URL here, so log minimally
              updateRequestsTab({ method: 'N/A', endpoint: 'XHR Request', timestamp: new Date().toISOString(), authToken: capturedAuthToken });
              attemptProfileFetch();
            }
            return originalSetRequestHeader.apply(this, arguments);
          };
        }
        
        console.log("[SupaCheck] Network monitoring setup complete.");
      }
      
      // Function to update the Detection tab (called when URL/Key found after initial load)
      function updateDetectionTab() {
        if (!widget) return;
        var detectionContent = widget.querySelector('.supacheck-tab-content[data-tab="detection"]');
        if (!detectionContent) return;
        
        // Clear previous content
        detectionContent.innerHTML = '';
        
        if (results.url) {
            var urlEl = document.createElement('p');
            urlEl.style.fontSize = '12px';
            urlEl.innerHTML = '<b>URL:</b> ' + results.url;
            detectionContent.appendChild(urlEl);
        }
        if (results.key) {
            var keyEl = document.createElement('p');
            keyEl.style.fontSize = '12px';
            keyEl.innerHTML = '<b>Anon Key:</b> ' + results.key.substring(0, 10) + '...';
            detectionContent.appendChild(keyEl);
        }
        if (!results.url && !results.key) {
             var p = document.createElement('p');
             p.textContent = 'Supabase URL/Key not found in static scan.';
             detectionContent.appendChild(p);
        }
      }
      
      // Main scanner function
      function scanForSupabase() {
        try {
          console.log("[SupaCheck] Starting simplified Supabase scanner...");
          
          var results = {
            url: null,
            key: null,
            issues: []
          };
          
          // Pattern to match <hash>.supabase.co
          var supabaseUrlPattern = /([a-zA-Z0-9\-_]+\.supabase\.co)/g;
          
          // Pattern to match potential Supabase anon keys
          var supabaseAnonKeyPattern = /eyJ[a-zA-Z0-9_.\-]{50,}/g; // Basic JWT pattern, adjust length as needed
          
          // Flag to track if initial detection is complete
          var initialDetectionComplete = false;

          // Function to check content for Supabase URL and Key
          function checkContentForSupabase(content) {
            if (!content) return false;
            
            var foundSomethingNew = false;
            
            try {
              // Check for Supabase URLs
              if (!results.url) {
                var urlMatches = content.match(supabaseUrlPattern);
                if (urlMatches && urlMatches[0]) {
                  console.log("[SupaCheck] Found Supabase URL:", urlMatches[0]);
                  results.url = urlMatches[0];
                  foundSomethingNew = true;
                }
              }
              
              // Check for potential Anon keys
              if (!results.key) {
                var keyMatches = content.match(supabaseAnonKeyPattern);
                if (keyMatches && keyMatches[0]) {
                  // Basic check to avoid capturing auth tokens here
                  if (keyMatches[0].length < 500) { 
                    console.log("[SupaCheck] Found potential Supabase Anon Key.");
                    results.key = keyMatches[0];
                    foundSomethingNew = true;
                  }
                }
              }

            } catch (err) {
              console.error("[SupaCheck] Error checking content:", err);
            }
            
            return foundSomethingNew;
          }
          
          // Check <script> tags
          var scripts = document.querySelectorAll('script');
          for (var i = 0; i < scripts.length; i++) {
            var scriptContent = scripts[i].textContent || '';
            checkContentForSupabase(scriptContent);
            
            // Check external scripts if needed
            if (!results.url || !results.key) {
              var src = scripts[i].getAttribute('src');
              if (src && src.endsWith('.js')) {
                fetchContent(src, function(externalContent) {
                  if (checkContentForSupabase(externalContent) && widget) {
                     updateDetectionTab(); // Update UI if something new is found
                  }
                });
              }
            }
            // Stop early if both found
            if (results.url && results.key) break;
          }
          
          // Check HTML if needed
          if (!results.url || !results.key) {
             var html = document.documentElement.innerHTML;
             checkContentForSupabase(html);
          }
          
          initialDetectionComplete = true;
          console.log("[SupaCheck] Initial detection completed:", results);
          
          // Create initial UI
          createIndicator(results.url || results.key, results);
          
          // Setup network monitoring
          setupNetworkMonitoring(results); // Pass initial results
          
        } catch (err) {
          logError("Error scanning for Supabase:", err);
          createIndicator(false, {url: null, key: null, issues: []});
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