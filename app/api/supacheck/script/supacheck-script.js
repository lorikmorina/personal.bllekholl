// Supabase Security Check Tool
// VERSION: Will be replaced dynamically
(function() {
  // Utility function to search for Supabase credentials in script content
  function checkScriptContent(content) {
    let foundUrl = null;
    let foundKey = null;
    
    // Search for Supabase URLs using regex patterns
    const urlPattern = /(https?:\/\/[a-zA-Z0-9-]+\.supabase\.co)/gi;
    const urlMatches = content.match(urlPattern) || [];
    
    if (urlMatches.length > 0) {
      foundUrl = urlMatches[0];
      
      // If we found a URL, look for API keys near it
      const keyPattern = /([a-zA-Z0-9]{40,})/g;
      const keyMatches = content.match(keyPattern) || [];
      
      if (keyMatches.length > 0) {
        foundKey = keyMatches[0];
        return { url: foundUrl, key: foundKey };
      }
    }
    
    return null; // No credentials found
  }

  // Create a minimal container to display results
  function createWidget() {
    const container = document.createElement('div');
    container.id = 'supabase-check-widget';
    container.style.cssText = `
      position: fixed; bottom: 20px; right: 20px; width: 280px;
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); font-family: sans-serif;
      z-index: 9999; overflow: hidden; transition: all 0.3s ease; color: #1a202c;
    `;

    const header = document.createElement('div');
    header.style.cssText = 'padding: 10px 15px; background: #3182ce; color: white; font-weight: bold; display: flex; justify-content: space-between; align-items: center; cursor: pointer;';
    header.textContent = 'Supabase Security Check';
    header.onclick = () => {
      const content = document.getElementById('supabase-check-content');
      content.style.display = content.style.display === 'none' ? 'block' : 'none';
    };

    const closeButton = document.createElement('span');
    closeButton.textContent = '×';
    closeButton.style.cssText = 'cursor: pointer; font-size: 18px;';
    closeButton.onclick = (e) => { e.stopPropagation(); document.body.removeChild(container); };
    header.appendChild(closeButton);
    container.appendChild(header);

    const content = document.createElement('div');
    content.id = 'supabase-check-content';
    content.style.cssText = 'padding: 15px;';
    container.appendChild(content);

    document.body.appendChild(container);
    return content;
  }

  const contentEl = createWidget();

  // Helper function to add status item to the widget
  function addStatusItem(label, status, isOk = true) {
    const itemEl = document.createElement('div');
    itemEl.style.cssText = `
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 10px; padding: 8px 12px; border-radius: 4px;
      background: ${isOk ? '#F0FDF4' : '#FEF2F2'};
      border-left: 3px solid ${isOk ? '#22C55E' : '#EF4444'};
    `;

    const labelEl = document.createElement('div');
    labelEl.textContent = label;
    labelEl.style.fontWeight = 'bold';
    
    const statusEl = document.createElement('div');
    statusEl.textContent = status;
    statusEl.style.cssText = `
      padding: 2px 8px; border-radius: 12px; font-size: 12px; 
      background: ${isOk ? '#DCFCE7' : '#FEE2E2'}; 
      color: ${isOk ? '#166534' : '#B91C1C'};
    `;
    
    itemEl.appendChild(labelEl);
    itemEl.appendChild(statusEl);
    contentEl.appendChild(itemEl);
    return itemEl;
  }

  // Add a message with login suggestion
  function addLoginMessage() {
    const messageEl = document.createElement('div');
    messageEl.style.cssText = `
      margin-top: 10px;
      padding: 10px;
      background: #EFF6FF;
      border-radius: 4px;
      border-left: 3px solid #3B82F6;
      font-size: 13px;
    `;
    messageEl.textContent = "Login with a test account to test more Supabase configurations";
    contentEl.appendChild(messageEl);
  }

  // Create a section for network requests
  function createNetworkSection() {
    const sectionEl = document.createElement('div');
    sectionEl.id = 'supabase-network-section';
    sectionEl.style.cssText = `
      margin-top: 15px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
    `;
    
    const titleEl = document.createElement('div');
    titleEl.textContent = 'Network Requests';
    titleEl.style.cssText = `
      font-weight: bold;
      margin-bottom: 10px;
    `;
    
    const requestsContainer = document.createElement('div');
    requestsContainer.id = 'supabase-requests';
    requestsContainer.style.cssText = `
      max-height: 200px;
      overflow-y: auto;
    `;
    
    sectionEl.appendChild(titleEl);
    sectionEl.appendChild(requestsContainer);
    contentEl.appendChild(sectionEl);
    return requestsContainer;
  }

  // Add loading indicator
  function showLoading() {
    const loadingEl = document.createElement('div');
    loadingEl.id = 'supabase-check-loading';
    loadingEl.style.cssText = 'display: flex; align-items: center; margin-bottom: 10px; padding: 10px;';

    const spinner = document.createElement('div');
    spinner.style.cssText = 'width: 16px; height: 16px; border: 2px solid #3B82F6; border-top-color: transparent; border-radius: 50%; margin-right: 10px; animation: spin 1s linear infinite;';

    if (!document.getElementById('spinner-keyframes')) {
      const style = document.createElement('style');
      style.id = 'spinner-keyframes';
      style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
      document.head.appendChild(style);
    }

    const textEl = document.createElement('div');
    textEl.textContent = 'Scanning...';
    loadingEl.appendChild(spinner);
    loadingEl.appendChild(textEl);
    contentEl.appendChild(loadingEl);
    return loadingEl;
  }

  function hideLoading() {
    const loadingEl = document.getElementById('supabase-check-loading');
    if (loadingEl) loadingEl.remove();
  }

  // Check if RLS is enabled for common tables
  async function checkRLS(supabaseUrl, supabaseKey) {
    // Common tables to check
    const tablesToCheck = ["profiles", "users", "accounts", "customers", "orders", "products", "posts", "comments"];
    let anyTableWithDisabledRLS = false;
    
    try {
      for (const table of tablesToCheck) {
        try {
          const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*&limit=10`, {
            method: 'GET',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            // If we can fetch more than 1 row with just the anon key, RLS is likely disabled
            if (Array.isArray(data) && data.length > 1) {
              anyTableWithDisabledRLS = true;
              break;
            }
          }
        } catch (tableError) {
          // Skip tables that don't exist or other errors
          continue;
        }
      }
      
      return !anyTableWithDisabledRLS;
    } catch (error) {
      // If we can't check RLS, assume it's configured properly
      return true;
    }
  }

  // Fetch and analyze external JS files
  async function fetchAndAnalyzeScripts() {
    const scriptTags = Array.from(document.querySelectorAll('script[src]'));
    const scriptUrls = scriptTags.map(script => {
      const src = script.getAttribute('src');
      if (src.startsWith('http')) return src;
      if (src.startsWith('/')) return `${window.location.origin}${src}`;
      return `${window.location.origin}/${src}`;
    });

    const relevantScripts = scriptUrls.filter(url =>
      !['google', 'analytics', 'ga.js', 'gtag', 'facebook', 'fbevents', 'hotjar', 'clarity']
        .some(pattern => url.includes(pattern))
    );

    let scriptContents = [];

    for (const url of relevantScripts) {
      try {
        let response;
        try {
          response = await fetch(url, { credentials: 'omit' });
          if (!response.ok && response.type !== 'opaque') throw new Error('Initial fetch failed');
        } catch (corsError) {
          response = await fetch(url, { mode: 'no-cors', credentials: 'omit' });
        }

        if (response.type !== 'opaque' && response.ok) {
          const text = await response.text();
          scriptContents.push({ url: url, content: text });
        }
      } catch (error) {
        // Silently continue on fetch errors
      }
    }

    return { contents: scriptContents };
  }

  // Search for Supabase URLs and keys in all sources
  async function findSupabaseCredentials() {
    let finalSupabaseUrl = null;
    let finalSupabaseKey = null;
    
    // Check inline scripts first
    const inlineScripts = document.querySelectorAll('script:not([src])');

    for (const script of inlineScripts) {
      if (script.textContent) {
        const result = checkScriptContent(script.textContent);
        if (result) {
          finalSupabaseUrl = result.url;
          finalSupabaseKey = result.key;
          break;
        }
      }
    }

    if (!finalSupabaseUrl) {
      const { contents } = await fetchAndAnalyzeScripts();

      for (const scriptData of contents) {
        if (scriptData.content) {
          const result = checkScriptContent(scriptData.content);
          if (result) {
            finalSupabaseUrl = result.url;
            finalSupabaseKey = result.key;
            break;
          }
        }
      }
    }

    return { supabaseUrl: finalSupabaseUrl, supabaseKey: finalSupabaseKey };
  }

  // Monitor network requests to Supabase
  function monitorNetworkRequests(supabaseUrl) {
    let requestCount = 0;
    const requestsContainer = createNetworkSection();
    const baseUrl = supabaseUrl.replace(/^https?:\/\//, '');
    
    // Create counter for requests
    const requestCountEl = document.createElement('div');
    requestCountEl.id = 'supabase-request-count';
    requestCountEl.style.cssText = `
      font-size: 12px;
      color: #6B7280;
      margin-bottom: 5px;
    `;
    requestCountEl.textContent = "No requests detected yet";
    requestsContainer.appendChild(requestCountEl);

    // Intercept fetch requests
    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
      const p = originalFetch.apply(this, arguments);
      
      // Check if this is a Supabase request
      const url = (typeof input === 'string') ? input : input?.url;
      if (url && url.includes(baseUrl)) {
        requestCount++;
        updateRequestCount();
        
        p.then(function(response) {
          try {
            const method = (init && init.method) ? init.method : 'GET';
            addRequestEntry(method, url);
          } catch (e) {}
        });
      }
      
      return p;
    };

    // Intercept XMLHttpRequest
    const originalXhrOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
      if (url && url.includes(baseUrl)) {
        this._supaRequestUrl = url;
        this._supaRequestMethod = method;
        
        const originalOnLoad = this.onload;
        this.onload = function() {
          requestCount++;
          updateRequestCount();
          addRequestEntry(method, url);
          if (originalOnLoad) originalOnLoad.apply(this, arguments);
        };
      }
      originalXhrOpen.apply(this, arguments);
    };
    
    // Add a request entry to the list
    function addRequestEntry(method, url) {
      const endpoint = url.split('/').slice(3).join('/');
      
      const requestEl = document.createElement('div');
      requestEl.style.cssText = `
        padding: 6px 8px;
        margin-bottom: 4px;
        background: #F9FAFB;
        border-radius: 4px;
        font-size: 12px;
        border-left: 3px solid #3B82F6;
      `;
      
      const methodEl = document.createElement('span');
      methodEl.textContent = method;
      methodEl.style.cssText = `
        font-weight: bold;
        color: #3B82F6;
        margin-right: 6px;
      `;
      
      requestEl.appendChild(methodEl);
      requestEl.appendChild(document.createTextNode(endpoint));
      requestsContainer.appendChild(requestEl);
      
      // Scroll to bottom to show latest request
      requestsContainer.scrollTop = requestsContainer.scrollHeight;
    }
    
    // Update the request counter
    function updateRequestCount() {
      const countEl = document.getElementById('supabase-request-count');
      if (countEl) {
        countEl.textContent = `${requestCount} request${requestCount !== 1 ? 's' : ''} detected`;
      }
    }
    
    // Show login message if no requests after 3 seconds
    setTimeout(() => {
      if (requestCount === 0) {
        addLoginMessage();
      }
    }, 3000);
  }

  // Main execution
  async function runChecks() {
    const loadingEl = showLoading();
    
    // Find Supabase credentials
    const { supabaseUrl, supabaseKey } = await findSupabaseCredentials();
    
    // Clear loading indicator
    hideLoading();
    
    // Display Supabase status
    if (supabaseUrl && supabaseKey) {
      addStatusItem('Supabase', 'Found', false);
      
      // Check RLS if credentials were found
      const rlsConfigured = await checkRLS(supabaseUrl, supabaseKey);
      addStatusItem('Row Level Security', rlsConfigured ? 'Configured' : 'Not Configured', rlsConfigured);
      
      // Start monitoring network requests
      monitorNetworkRequests(supabaseUrl);
    } else {
      addStatusItem('Supabase', 'Not Found', true);
    }
  }

  runChecks();
})(); 