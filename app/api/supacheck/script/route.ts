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
        var results = details || { urls: [], keys: [], issues: [] };
        
        // Create widget container
        widget = document.createElement('div');
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
        widget.style.backgroundColor = '#f0fdf4';
        widget.style.color = '#166534';
        widget.style.border = '1px solid #dcfce7';
        
        // Create tabs container
        var tabsContainer = document.createElement('div');
        tabsContainer.style.display = 'none';
        tabsContainer.style.marginTop = '10px';
        
        // Create tab headers
        var tabHeaders = document.createElement('div');
        tabHeaders.style.display = 'flex';
        tabHeaders.style.borderBottom = '1px solid rgba(0,0,0,0.1)';
        tabHeaders.style.marginBottom = '8px';
        
        var detectionTab = createTabHeader('Detection', true);
        var requestsTab = createTabHeader('Requests', false);
        var userTab = createTabHeader('User Info', false);
        
        tabHeaders.appendChild(detectionTab);
        tabHeaders.appendChild(requestsTab);
        tabHeaders.appendChild(userTab);
        
        tabsContainer.appendChild(tabHeaders);
        
        // Create tab contents
        var detectionContent = document.createElement('div');
        detectionContent.className = 'supacheck-tab-content';
        detectionContent.style.display = 'block';
        
        var requestsContent = document.createElement('div');
        requestsContent.className = 'supacheck-tab-content';
        requestsContent.style.display = 'none';
        
        var userContent = document.createElement('div');
        userContent.className = 'supacheck-tab-content';
        userContent.style.display = 'none';
        
        // Fill detection tab content
        if (found) {
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
          
          // Fill detection content
          if (results.urls.length > 0) {
            var urlsTitle = document.createElement('div');
            urlsTitle.style.fontWeight = 'bold';
            urlsTitle.style.marginBottom = '4px';
            urlsTitle.textContent = 'Detected endpoints:';
            detectionContent.appendChild(urlsTitle);
            
            var urlsList = document.createElement('ul');
            urlsList.style.margin = '0';
            urlsList.style.paddingLeft = '16px';
            
            for (var i = 0; i < results.urls.length; i++) {
              var listItem = document.createElement('li');
              listItem.textContent = results.urls[i];
              urlsList.appendChild(listItem);
            }
            
            detectionContent.appendChild(urlsList);
          }
          
          if (results.keys.length > 0) {
            var keysTitle = document.createElement('div');
            keysTitle.style.fontWeight = 'bold';
            keysTitle.style.marginTop = '8px';
            keysTitle.style.marginBottom = '4px';
            keysTitle.textContent = 'Potential API keys found:';
            detectionContent.appendChild(keysTitle);
            
            var keysList = document.createElement('ul');
            keysList.style.margin = '0';
            keysList.style.paddingLeft = '16px';
            keysList.style.color = '#b91c1c';
            
            for (var i = 0; i < results.keys.length; i++) {
              var keyItem = document.createElement('li');
              keyItem.textContent = results.keys[i].substring(0, 8) + '...';
              keysList.appendChild(keyItem);
            }
            
            detectionContent.appendChild(keysList);
          }
          
          if (results.issues.length > 0) {
            var issuesTitle = document.createElement('div');
            issuesTitle.style.fontWeight = 'bold';
            issuesTitle.style.marginTop = '8px';
            issuesTitle.style.marginBottom = '4px';
            issuesTitle.textContent = 'Potential issues:';
            detectionContent.appendChild(issuesTitle);
            
            var issuesList = document.createElement('ul');
            issuesList.style.margin = '0';
            issuesList.style.paddingLeft = '16px';
            issuesList.style.color = '#b91c1c';
            
            for (var i = 0; i < results.issues.length; i++) {
              var issueItem = document.createElement('li');
              issueItem.textContent = results.issues[i];
              issuesList.appendChild(issueItem);
            }
            
            detectionContent.appendChild(issuesList);
          }
        } else {
          var noSupabase = document.createElement('p');
          noSupabase.textContent = 'No Supabase usage detected in static scan.';
          detectionContent.appendChild(noSupabase);
        }
        
        // Set up requests tab with default content
        var requestsIntro = document.createElement('p');
        requestsIntro.style.fontSize = '13px';
        requestsIntro.style.marginBottom = '8px';
        requestsIntro.textContent = 'Monitoring network for Supabase requests...';
        requestsContent.appendChild(requestsIntro);
        
        var requestsList = document.createElement('div');
        requestsList.id = 'supacheck-requests-list';
        requestsList.style.fontSize = '12px';
        requestsList.style.maxHeight = '200px';
        requestsList.style.overflowY = 'auto';
        requestsContent.appendChild(requestsList);
        
        // Set up user tab with default content
        var userIntro = document.createElement('p');
        userIntro.style.fontSize = '13px';
        userIntro.textContent = 'Waiting to capture user information...';
        userContent.appendChild(userIntro);
        
        var userInfo = document.createElement('pre');
        userInfo.id = 'supacheck-user-info';
        userInfo.style.fontSize = '12px';
        userInfo.style.backgroundColor = 'rgba(0,0,0,0.05)';
        userInfo.style.padding = '8px';
        userInfo.style.borderRadius = '4px';
        userInfo.style.marginTop = '8px';
        userInfo.style.maxHeight = '200px';
        userInfo.style.overflowY = 'auto';
        userInfo.style.display = 'none';
        userContent.appendChild(userInfo);
        
        // Add tab contents to container
        tabsContainer.appendChild(detectionContent);
        tabsContainer.appendChild(requestsContent);
        tabsContainer.appendChild(userContent);
        
        // Add tabs container to widget
        widget.appendChild(tabsContainer);
        
        // Toggle widget expansion on click
        widget.addEventListener('click', function(event) {
          if (event.target.classList && event.target.classList.contains('supacheck-tab')) {
            // Handle tab switching
            var tabName = event.target.getAttribute('data-tab');
            switchTab(tabName);
            event.stopPropagation();
          } else {
            // Expand/collapse widget
            isExpanded = !isExpanded;
            tabsContainer.style.display = isExpanded ? 'block' : 'none';
          }
        });
        
        // Helper function to create tab header
        function createTabHeader(name, isActive) {
          var tab = document.createElement('div');
          tab.className = 'supacheck-tab';
          tab.setAttribute('data-tab', name.toLowerCase());
          tab.style.padding = '6px 10px';
          tab.style.cursor = 'pointer';
          tab.style.fontSize = '13px';
          tab.style.borderBottom = isActive ? '2px solid #166534' : 'none';
          tab.style.color = isActive ? '#166534' : '#65a30d';
          tab.textContent = name;
          return tab;
        }
        
        // Function to switch between tabs
        function switchTab(tabName) {
          // Update tab headers
          var tabs = document.querySelectorAll('.supacheck-tab');
          for (var i = 0; i < tabs.length; i++) {
            var tab = tabs[i];
            var isActive = tab.getAttribute('data-tab') === tabName;
            tab.style.borderBottom = isActive ? '2px solid #166534' : 'none';
            tab.style.color = isActive ? '#166534' : '#65a30d';
          }
          
          // Update tab contents
          var contents = document.querySelectorAll('.supacheck-tab-content');
          for (var i = 0; i < contents.length; i++) {
            contents[i].style.display = 'none';
          }
          
          // Show the selected tab
          if (tabName === 'detection') {
            detectionContent.style.display = 'block';
          } else if (tabName === 'requests') {
            requestsContent.style.display = 'block';
          } else if (tabName === 'user info') {
            userContent.style.display = 'block';
          }
        }
        
        document.body.appendChild(widget);
      }
      
      // Function to update requests tab
      function updateRequestsTab(request) {
        if (!widget) return;
        
        var requestsList = document.getElementById('supacheck-requests-list');
        if (!requestsList) return;
        
        // Create request item
        var item = document.createElement('div');
        item.style.padding = '8px';
        item.style.borderBottom = '1px solid rgba(0,0,0,0.1)';
        item.style.fontSize = '12px';
        
        var endpoint = document.createElement('div');
        endpoint.style.fontWeight = 'bold';
        endpoint.textContent = request.method + ' ' + extractEndpoint(request.endpoint);
        
        var details = document.createElement('div');
        details.style.color = '#666';
        details.style.fontSize = '11px';
        details.style.marginTop = '2px';
        details.textContent = formatTime(request.timestamp);
        
        if (request.authToken) {
          var authBadge = document.createElement('span');
          authBadge.style.backgroundColor = '#f59e0b';
          authBadge.style.color = 'white';
          authBadge.style.padding = '1px 4px';
          authBadge.style.borderRadius = '3px';
          authBadge.style.fontSize = '10px';
          authBadge.style.marginLeft = '5px';
          authBadge.textContent = 'Auth';
          details.appendChild(authBadge);
        }
        
        if (request.userInfo) {
          var userBadge = document.createElement('span');
          userBadge.style.backgroundColor = '#0ea5e9';
          userBadge.style.color = 'white';
          userBadge.style.padding = '1px 4px';
          userBadge.style.borderRadius = '3px';
          userBadge.style.fontSize = '10px';
          userBadge.style.marginLeft = '5px';
          userBadge.textContent = 'User';
          details.appendChild(userBadge);
          
          // Update user info tab
          updateUserInfoTab(request.userInfo);
        }
        
        item.appendChild(endpoint);
        item.appendChild(details);
        
        // Add to the beginning of the list
        if (requestsList.firstChild) {
          requestsList.insertBefore(item, requestsList.firstChild);
        } else {
          requestsList.appendChild(item);
        }
        
        // Limit the number of items to 20
        while (requestsList.children.length > 20) {
          requestsList.removeChild(requestsList.lastChild);
        }
      }
      
      // Function to update user info tab
      function updateUserInfoTab(userInfo) {
        if (!widget) return;
        
        var userInfoElement = document.getElementById('supacheck-user-info');
        if (!userInfoElement) return;
        
        // Format the user info as JSON
        userInfoElement.textContent = JSON.stringify(userInfo, null, 2);
        userInfoElement.style.display = 'block';
        
        // Update the intro text
        var userIntro = userInfoElement.previousSibling;
        if (userIntro) {
          userIntro.textContent = 'User information captured:';
        }
        
        // Store for later comparison
        lastUserInfo = userInfo;
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
      function setupNetworkMonitoring() {
        // Check if fetch is available
        if (window.fetch) {
          // Store the original fetch
          var originalFetch = window.fetch;
          
          // Override fetch
          window.fetch = function(resource, options) {
            var url = (resource instanceof Request) ? resource.url : resource;
            var method = (resource instanceof Request) ? resource.method : (options && options.method) || 'GET';
            
            // Check if this is a Supabase request
            if (url.toString().includes('supabase')) {
              var headers = {};
              
              // Extract headers from Request object or options
              if (resource instanceof Request) {
                resource.headers.forEach(function(value, name) {
                  headers[name] = value;
                });
              } else if (options && options.headers) {
                if (options.headers instanceof Headers) {
                  options.headers.forEach(function(value, name) {
                    headers[name] = value;
                  });
                } else {
                  headers = options.headers;
                }
              }
              
              // Look for authorization headers
              var authToken = null;
              if (headers.authorization || headers.Authorization) {
                authToken = headers.authorization || headers.Authorization;
              }
              
              // Make the fetch call and monitor the response
              return originalFetch.apply(this, arguments)
                .then(function(response) {
                  // Clone the response so we can read the body
                  var clone = response.clone();
                  
                  clone.json().then(function(data) {
                    // Process the response data
                    var userInfo = null;
                    
                    // Try to extract user information from the response
                    if (data && data.user) {
                      userInfo = data.user;
                    } else if (data && data.data && data.data.user) {
                      userInfo = data.data.user;
                    }
                    
                    // Create request object
                    var requestData = {
                      endpoint: url.toString(),
                      method: method,
                      headers: headers,
                      response: data,
                      timestamp: new Date().toISOString(),
                      authToken: authToken,
                      userInfo: userInfo
                    };
                    
                    // Add to captured requests
                    capturedRequests.push(requestData);
                    
                    // Update the UI
                    updateRequestsTab(requestData);
                    
                  }).catch(function(error) {
                    // Not JSON data, that's fine
                  });
                  
                  return response; // Return the original response
                });
            }
            
            // Not a Supabase request, proceed normally
            return originalFetch.apply(this, arguments);
          };
        }
        
        // Check if XMLHttpRequest is available
        if (window.XMLHttpRequest) {
          var originalOpen = XMLHttpRequest.prototype.open;
          var originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
          var originalSend = XMLHttpRequest.prototype.send;
          
          // Store request data for each XHR instance
          var requestData = new WeakMap();
          
          // Override open to capture method and URL
          XMLHttpRequest.prototype.open = function(method, url) {
            if (url.toString().includes('supabase')) {
              // Initialize request data
              requestData.set(this, {
                method: method,
                url: url,
                headers: {},
                timestamp: new Date().toISOString()
              });
            }
            return originalOpen.apply(this, arguments);
          };
          
          // Override setRequestHeader to capture headers
          XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
            var data = requestData.get(this);
            if (data) {
              data.headers[name] = value;
              
              // Check for authorization header
              if (name.toLowerCase() === 'authorization') {
                data.authToken = value;
              }
            }
            return originalSetRequestHeader.apply(this, arguments);
          };
          
          // Override send to capture the response
          XMLHttpRequest.prototype.send = function() {
            var xhr = this;
            var data = requestData.get(xhr);
            
            if (data) {
              var originalOnReadyStateChange = xhr.onreadystatechange;
              
              xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                  try {
                    var response = JSON.parse(xhr.responseText);
                    data.response = response;
                    
                    // Try to extract user information
                    if (response && response.user) {
                      data.userInfo = response.user;
                    } else if (response && response.data && response.data.user) {
                      data.userInfo = response.data.user;
                    }
                    
                    // Add to captured requests
                    capturedRequests.push({
                      endpoint: data.url.toString(),
                      method: data.method,
                      headers: data.headers,
                      response: data.response,
                      timestamp: data.timestamp,
                      authToken: data.authToken,
                      userInfo: data.userInfo
                    });
                    
                    // Update the UI
                    updateRequestsTab(data);
                    
                  } catch (e) {
                    // Not JSON, ignore
                  }
                }
                
                if (originalOnReadyStateChange) {
                  originalOnReadyStateChange.apply(xhr, arguments);
                }
              };
            }
            
            return originalSend.apply(this, arguments);
          };
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
                  if (updated && widget) {
                    // Update the count badge
                    var countBadge = widget.querySelector('.supacheck-count');
                    if (countBadge) {
                      countBadge.textContent = results.urls.length.toString();
                    }
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
          
          // Create initial UI
          createIndicator(
            results.urls.length > 0 || results.keys.length > 0 || results.issues.length > 0, 
            results
          );
          
          // Setup network monitoring
          setupNetworkMonitoring();
          
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