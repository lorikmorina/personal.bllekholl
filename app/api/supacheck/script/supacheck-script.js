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
      position: fixed; bottom: 20px; right: 20px; width: 320px;
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); font-family: sans-serif;
      z-index: 9999; overflow: hidden; transition: all 0.3s ease; color: #1a202c;
      max-height: 80vh; display: flex; flex-direction: column;
    `;

    const header = document.createElement('div');
    header.style.cssText = 'padding: 10px 15px; background: #3182ce; color: white; font-weight: bold; display: flex; justify-content: space-between; align-items: center; cursor: pointer; flex-shrink: 0;';
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
    content.style.cssText = 'padding: 15px; overflow-y: auto; flex-grow: 1;';
    container.appendChild(content);

    document.body.appendChild(container);
    return content;
  }

  const contentEl = createWidget();
  
  // Keep track of our own verification requests so we don't display them
  const ourVerificationRequests = new Set();
  
  // Store captured response data
  const capturedResponses = new Map();

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

  // Add a message about CORS limitations
  function addCorsInfoMessage() {
    const messageEl = document.createElement('div');
    messageEl.style.cssText = `
      margin-top: 10px;
      padding: 10px;
      background: #FEF3C7;
      border-radius: 4px;
      border-left: 3px solid #F59E0B;
      font-size: 13px;
      line-height: 1.4;
    `;
    messageEl.innerHTML = "⚠️ <strong>CORS Alert:</strong> Some Supabase requests may not be visible due to CORS restrictions. " +
      "If you're testing on a different domain than your app, data may be limited.<br><br>" +
      "For complete testing, run this check directly on your deployed application.";
    
    contentEl.appendChild(messageEl);
  }

  // Update the existing addResponseInfoMessage function
  function addResponseInfoMessage() {
    const messageEl = document.createElement('div');
    messageEl.style.cssText = `
      margin-top: 10px;
      padding: 10px;
      background: #EFF6FF;
      border-radius: 4px;
      border-left: 3px solid #3B82F6;
      font-size: 13px;
      line-height: 1.4;
    `;
    messageEl.innerHTML = "Response data will be captured and displayed here in real-time as requests are made.<br><br>" +
      "Interact with the application to generate new Supabase requests and see their responses.";
    
    const responsesContainer = document.getElementById('supabase-responses');
    if (responsesContainer && responsesContainer.children.length === 0) {
      responsesContainer.appendChild(messageEl);
    }
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

  // Create a section for discovered tables
  function createTablesSection() {
    const sectionEl = document.createElement('div');
    sectionEl.id = 'supabase-tables-section';
    sectionEl.style.cssText = `
      margin-top: 15px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
    `;
    
    const titleEl = document.createElement('div');
    titleEl.textContent = 'Discovered Tables';
    titleEl.style.cssText = `
      font-weight: bold;
      margin-bottom: 10px;
    `;
    
    const tablesContainer = document.createElement('div');
    tablesContainer.id = 'supabase-tables';
    
    sectionEl.appendChild(titleEl);
    sectionEl.appendChild(tablesContainer);
    contentEl.appendChild(sectionEl);
    return tablesContainer;
  }

  // Create a section for response data
  function createResponseSection() {
    const sectionEl = document.createElement('div');
    sectionEl.id = 'supabase-response-section';
    sectionEl.style.cssText = `
      margin-top: 15px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
    `;
    
    const titleEl = document.createElement('div');
    titleEl.textContent = 'Response Data';
    titleEl.style.cssText = `
      font-weight: bold;
      margin-bottom: 10px;
    `;
    
    const responseContainer = document.createElement('div');
    responseContainer.id = 'supabase-responses';
    
    sectionEl.appendChild(titleEl);
    sectionEl.appendChild(responseContainer);
    contentEl.appendChild(sectionEl);
    
    // Add info message by default
    addResponseInfoMessage();
    
    return responseContainer;
  }

  // Add a table entry to the list
  function addTableEntry(tableName, endpoint) {
    const tablesContainer = document.getElementById('supabase-tables');
    if (!tablesContainer) return;
    
    // Check if this table is already listed
    if (document.getElementById(`table-${tableName}`)) {
      return; // Already added
    }
    
    const tableEl = document.createElement('div');
    tableEl.id = `table-${tableName}`;
    tableEl.style.cssText = `
      padding: 6px 8px;
      margin-bottom: 4px;
      background: #F9FAFB;
      border-radius: 4px;
      font-size: 12px;
      border-left: 3px solid #22C55E;
    `;
    
    const tableNameEl = document.createElement('div');
    tableNameEl.style.cssText = `
      font-weight: bold;
      margin-bottom: 2px;
    `;
    tableNameEl.textContent = tableName;
    
    const endpointEl = document.createElement('div');
    endpointEl.style.cssText = `
      font-size: 11px;
      color: #6B7280;
      word-break: break-all;
    `;
    endpointEl.textContent = endpoint;
    
    tableEl.appendChild(tableNameEl);
    tableEl.appendChild(endpointEl);
    tablesContainer.appendChild(tableEl);
  }

  // Create a collapsible JSON viewer
  function createJsonViewer(id, data, endpoint) {
    if (!data) return null;
    
    const containerEl = document.createElement('div');
    containerEl.id = `json-container-${id}`;
    containerEl.style.cssText = `
      margin-bottom: 10px;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      overflow: hidden;
    `;
    
    // Header with endpoint info
    const headerEl = document.createElement('div');
    headerEl.style.cssText = `
      padding: 8px 12px;
      background: #EBF5FF;
      font-weight: bold;
      font-size: 12px;
      cursor: pointer;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    
    // Extract endpoint path for display
    let endpointPath = endpoint;
    try {
      const url = new URL(endpoint);
      endpointPath = url.pathname + url.search;
    } catch (e) {}
    
    const endpointText = document.createElement('div');
    endpointText.textContent = endpointPath;
    endpointText.style.overflow = 'hidden';
    endpointText.style.textOverflow = 'ellipsis';
    endpointText.style.whiteSpace = 'nowrap';
    
    const toggleEl = document.createElement('span');
    toggleEl.textContent = '▼';
    toggleEl.style.marginLeft = '8px';
    
    headerEl.appendChild(endpointText);
    headerEl.appendChild(toggleEl);
    containerEl.appendChild(headerEl);
    
    // Content with JSON data
    const contentEl = document.createElement('div');
    contentEl.id = `json-content-${id}`;
    contentEl.style.cssText = `
      padding: 0;
      max-height: 300px;
      overflow-y: auto;
      background: #F8FAFC;
    `;
    
    // Handle error responses specially
    if (data.error || data.code || (data.message && (data.statusCode || data.status))) {
      const errorEl = document.createElement('div');
      errorEl.style.cssText = `
        padding: 12px;
        background: #FEF2F2;
        color: #B91C1C;
        font-family: monospace;
        white-space: pre-wrap;
        word-break: break-word;
      `;
      
      const errorTitle = document.createElement('div');
      errorTitle.style.cssText = `
        font-weight: bold;
        margin-bottom: 8px;
      `;
      
      errorTitle.textContent = `Error ${data.statusCode || data.status || 'Response'}`;
      errorEl.appendChild(errorTitle);
      
      const errorMessage = document.createElement('div');
      errorMessage.textContent = data.message || data.error || JSON.stringify(data, null, 2);
      errorEl.appendChild(errorMessage);
      
      contentEl.appendChild(errorEl);
    }
    // Create table representation of JSON
    else {
      const tableEl = document.createElement('table');
      tableEl.style.cssText = `
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
      `;
      
      // If data is an array, create a table for each item
      if (Array.isArray(data)) {
        if (data.length > 0) {
          // Add count header
          const countRow = document.createElement('tr');
          const countCell = document.createElement('td');
          countCell.style.cssText = `
            padding: 8px;
            background: #F1F5F9;
            color: #475569;
            font-style: italic;
            text-align: center;
            border-bottom: 1px solid #e2e8f0;
          `;
          countCell.textContent = `${data.length} item${data.length !== 1 ? 's' : ''} in array`;
          countRow.appendChild(countCell);
          tableEl.appendChild(countRow);
          
          for (let i = 0; i < Math.min(data.length, 5); i++) {
            const item = data[i];
            const rowEl = document.createElement('tr');
            
            const cellEl = document.createElement('td');
            cellEl.style.cssText = `
              padding: 8px;
              border-bottom: 1px solid #e2e8f0;
            `;
            
            // Display objects in a readable format
            if (typeof item === 'object' && item !== null) {
              const keys = Object.keys(item);
              
              // For items with more than 4 keys, show a summary
              if (keys.length > 4) {
                const summaryDiv = document.createElement('div');
                summaryDiv.style.cssText = `
                  display: flex;
                  flex-wrap: wrap;
                  gap: 4px;
                `;
                
                // Show ID or key properties prominently
                const idKeys = keys.filter(k => 
                  ['id', 'uuid', 'key', 'name', 'title'].includes(k.toLowerCase()));
                
                if (idKeys.length > 0) {
                  const idKey = idKeys[0];
                  const idValue = String(item[idKey]);
                  
                  const idBadge = document.createElement('span');
                  idBadge.style.cssText = `
                    background: #E0F2FE;
                    color: #0369A1;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-weight: bold;
                  `;
                  idBadge.textContent = `${idKey}: ${idValue}`;
                  summaryDiv.appendChild(idBadge);
                }
                
                // Show additional key info in badges
                for (let j = 0; j < Math.min(3, keys.length); j++) {
                  const key = keys[j];
                  if (idKeys.includes(key)) continue; // Skip keys we already showed
                  
                  const value = item[key];
                  if (value === null || value === undefined) continue;
                  
                  const badge = document.createElement('span');
                  badge.style.cssText = `
                    background: #F1F5F9;
                    color: #475569;
                    padding: 2px 6px;
                    border-radius: 4px;
                  `;
                  
                  // Format value based on type
                  let displayValue = String(value);
                  if (typeof value === 'object') {
                    displayValue = Array.isArray(value) ? 
                      `[${value.length} items]` : 
                      '{...}';
                  } else if (displayValue.length > 20) {
                    displayValue = displayValue.substring(0, 20) + '...';
                  }
                  
                  badge.textContent = `${key}: ${displayValue}`;
                  summaryDiv.appendChild(badge);
                }
                
                // Add expand button
                const expandBtn = document.createElement('button');
                expandBtn.style.cssText = `
                  background: #F8FAFC;
                  border: 1px solid #CBD5E1;
                  border-radius: 4px;
                  padding: 2px 6px;
                  font-size: 11px;
                  cursor: pointer;
                  margin-left: auto;
                `;
                expandBtn.textContent = 'View Full';
                
                expandBtn.onclick = (e) => {
                  e.stopPropagation();
                  const pre = document.createElement('pre');
                  pre.style.cssText = `
                    margin: 8px 0;
                    padding: 8px;
                    background: #F1F5F9;
                    border-radius: 4px;
                    overflow-x: auto;
                    font-family: monospace;
                    font-size: 11px;
                  `;
                  pre.textContent = JSON.stringify(item, null, 2);
                  
                  if (summaryDiv.nextElementSibling?.tagName === 'PRE') {
                    summaryDiv.nextElementSibling.remove();
                    expandBtn.textContent = 'View Full';
                  } else {
                    summaryDiv.parentNode.insertBefore(pre, summaryDiv.nextElementSibling);
                    expandBtn.textContent = 'Collapse';
                  }
                };
                
                summaryDiv.appendChild(expandBtn);
                cellEl.appendChild(summaryDiv);
              } else {
                // For simple objects, just stringify
                cellEl.textContent = JSON.stringify(item, null, 2);
              }
            } else {
              // For primitives, just display as text
              cellEl.textContent = String(item);
            }
            
            rowEl.appendChild(cellEl);
            tableEl.appendChild(rowEl);
          }
          
          if (data.length > 5) {
            const rowEl = document.createElement('tr');
            const cellEl = document.createElement('td');
            cellEl.style.cssText = `
              padding: 8px;
              color: #6B7280;
              font-style: italic;
              text-align: center;
            `;
            cellEl.textContent = `+ ${data.length - 5} more items`;
            rowEl.appendChild(cellEl);
            tableEl.appendChild(rowEl);
          }
        } else {
          const rowEl = document.createElement('tr');
          const cellEl = document.createElement('td');
          cellEl.style.cssText = `
            padding: 8px;
            color: #6B7280;
            font-style: italic;
          `;
          cellEl.textContent = 'Empty array';
          rowEl.appendChild(cellEl);
          tableEl.appendChild(rowEl);
        }
      } else {
        // Object representation as key-value pairs
        Object.entries(data).forEach(([key, value]) => {
          const rowEl = document.createElement('tr');
          rowEl.style.borderBottom = '1px solid #e2e8f0';
          
          const keyEl = document.createElement('td');
          keyEl.style.cssText = `
            padding: 6px 8px;
            font-weight: bold;
            width: 40%;
            word-break: break-all;
            vertical-align: top;
            border-right: 1px solid #e2e8f0;
          `;
          keyEl.textContent = key;
          
          const valueEl = document.createElement('td');
          valueEl.style.cssText = `
            padding: 6px 8px;
            word-break: break-all;
          `;
          
          if (value === null) {
            valueEl.textContent = 'null';
            valueEl.style.fontStyle = 'italic';
            valueEl.style.color = '#6B7280';
          } else if (typeof value === 'object') {
            const nestedJsonString = JSON.stringify(value, null, 2);
            if (nestedJsonString.length < 100) {
              valueEl.textContent = nestedJsonString;
            } else {
              valueEl.textContent = `Object with ${Object.keys(value).length} properties`;
              valueEl.style.color = '#3B82F6';
              valueEl.style.cursor = 'pointer';
              valueEl.onclick = () => {
                const details = document.createElement('pre');
                details.style.cssText = `
                  margin: 8px 0 0;
                  padding: 8px;
                  background: #F1F5F9;
                  border-radius: 4px;
                  overflow-x: auto;
                  white-space: pre-wrap;
                  font-family: monospace;
                  font-size: 11px;
                `;
                details.textContent = nestedJsonString;
                if (valueEl.querySelector('pre')) {
                  valueEl.removeChild(valueEl.querySelector('pre'));
                } else {
                  valueEl.appendChild(details);
                }
              };
            }
          } else {
            valueEl.textContent = String(value);
          }
          
          rowEl.appendChild(keyEl);
          rowEl.appendChild(valueEl);
          tableEl.appendChild(rowEl);
        });
      }
      
      contentEl.appendChild(tableEl);
    }
    
    containerEl.appendChild(contentEl);
    
    // Toggle content visibility on header click
    headerEl.onclick = () => {
      if (contentEl.style.display === 'none') {
        contentEl.style.display = 'block';
        toggleEl.textContent = '▼';
      } else {
        contentEl.style.display = 'none';
        toggleEl.textContent = '►';
      }
    };
    
    return containerEl;
  }

  // Add a response entry to the list
  function addResponseEntry(url, data) {
    const responsesContainer = document.getElementById('supabase-responses');
    if (!responsesContainer) return;
    
    // Remove any info message if it exists
    const infoMessage = responsesContainer.querySelector('div[style*="background: #FEF3C7"]');
    if (infoMessage) {
      responsesContainer.removeChild(infoMessage);
    }
    
    // Generate a unique ID for this response
    const id = url.replace(/[^a-zA-Z0-9]/g, '-');
    
    // Skip if we already have this response
    if (document.getElementById(`json-container-${id}`)) {
      return;
    }
    
    // Create the JSON viewer
    const jsonViewer = createJsonViewer(id, data, url);
    if (jsonViewer) {
      responsesContainer.appendChild(jsonViewer);
    }
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

  // Helper function to check if a URL contains any of our verification patterns
  function isVerificationRequest(url) {
    // Check if this is one of our verification requests
    if (ourVerificationRequests.has(url)) {
      return true;
    }
    
    // Check if it contains our verification pattern
    if (url.includes('select=*&limit=10')) {
      return true;
    }
    
    return false;
  }

  // Analyze the Performance API entries to find prior Supabase requests
  function analyzePerformanceEntries(supabaseUrl) {
    if (!window.performance || !window.performance.getEntriesByType) {
      return { requests: [], tableNames: [], authToken: null };
    }
    
    const baseUrl = supabaseUrl.replace(/^https?:\/\//, '');
    const resources = window.performance.getEntriesByType('resource');
    const requests = [];
    const tableNames = new Set();
    let authToken = null;
    
    // Look for Supabase requests in performance resources
    for (const resource of resources) {
      if (resource.name && resource.name.includes(baseUrl)) {
        const url = resource.name;
        
        // Skip if this is one of our verification requests
        if (isVerificationRequest(url)) {
          continue;
        }
        
        let method = 'GET'; // Default, since Performance API doesn't provide the method
        requests.push({ method, url });
        
        // Try to extract the table name from the URL
        // Example: https://xyz.supabase.co/rest/v1/profiles?select=*
        if (url.includes('/rest/v1/')) {
          const parts = url.split('/rest/v1/');
          if (parts.length > 1) {
            const pathPart = parts[1].split('?')[0].split('/')[0];
            if (pathPart && pathPart !== 'auth') {
              tableNames.add(pathPart);
            }
          }
        }
      }
    }
    
    // Try to find the auth token in local storage or IndexedDB
    try {
      // Check localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('supabase') || key.includes('auth'))) {
          try {
            const value = localStorage.getItem(key);
            const data = JSON.parse(value);
            if (data && data.access_token) {
              authToken = data.access_token;
              break;
            }
            if (data && data.currentSession && data.currentSession.access_token) {
              authToken = data.currentSession.access_token;
              break;
            }
          } catch (e) {
            // Not a valid JSON, skip
          }
        }
      }
    } catch (e) {
      // Ignore storage access errors
    }
    
    return { requests, tableNames: Array.from(tableNames), authToken };
  }

  // Check headers for tables
  function checkForHeaderTables() {
    // First, try to find tables through performance entries
    if (!window.performance || !window.performance.getEntriesByType) {
      return [];
    }
    
    const tables = new Set();
    
    // Check for any meta tags with Supabase info
    document.querySelectorAll('meta').forEach(meta => {
      const content = meta.getAttribute('content') || '';
      if (content.includes('supabase.co/rest/v1/')) {
        const match = content.match(/\/rest\/v1\/([a-zA-Z0-9_]+)/);
        if (match && match[1]) {
          tables.add(match[1]);
        }
      }
    });
    
    return Array.from(tables);
  }

  // Verify if tables exist and check RLS
  async function verifyTablesAndCheckRLS(supabaseUrl, supabaseKey, tablesToVerify = []) {
    // Common tables to check, plus any discovered tables
    const tablesToCheck = [
      ...new Set([
        ...tablesToVerify,
        "profiles", "users", "accounts", "customers", 
        "orders", "products", "posts", "comments"
      ])
    ];
    
    let anyTableWithDisabledRLS = false;
    const existingTables = new Set();
    
    // First, clean up any tables section since we'll repopulate
    const tablesSection = document.getElementById('supabase-tables');
    if (tablesSection) {
      tablesSection.innerHTML = '';
    }
    
    try {
      for (const table of tablesToCheck) {
        const verificationUrl = `${supabaseUrl}/rest/v1/${table}?select=*&limit=10`;
        
        // Track this as our verification request
        ourVerificationRequests.add(verificationUrl);
        
        try {
          const response = await fetch(verificationUrl, {
            method: 'GET',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            }
          });
          
          // Only consider table exists if status is 200
          if (response.status === 200) {
            const data = await response.json();
            // This table exists - add it to our UI
            existingTables.add(table);
            addTableEntry(table, verificationUrl);
            
            // Check RLS while we're at it
            if (Array.isArray(data) && data.length > 1) {
              anyTableWithDisabledRLS = true;
            }
          }
        } catch (tableError) {
          // Table doesn't exist or other error, don't add to UI
          continue;
        }
      }
      
      return { 
        rlsConfigured: !anyTableWithDisabledRLS, 
        existingTables: Array.from(existingTables)
      };
    } catch (error) {
      // If we can't check RLS, assume it's configured properly
      return { rlsConfigured: true, existingTables: [] };
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
    const responseContainer = createResponseSection();
    const baseUrl = supabaseUrl.replace(/^https?:\/\//, '');
    
    // Create the tables section
    createTablesSection();
    
    // Create counter for requests
    const requestCountEl = document.createElement('div');
    requestCountEl.id = 'supabase-request-count';
    requestCountEl.style.cssText = `
      font-size: 12px;
      color: #6B7280;
      margin-bottom: 5px;
    `;
    requestCountEl.textContent = "Checking for existing requests...";
    requestsContainer.appendChild(requestCountEl);
    
    // First, check for existing requests using Performance API
    const { requests, tableNames } = analyzePerformanceEntries(supabaseUrl);
    
    // Add any additional tables from headers
    const headerTables = checkForHeaderTables();
    const allTables = [...new Set([...tableNames, ...headerTables])];
    
    // Update the request count
    if (requests.length > 0) {
      requestCount = requests.length;
      requestCountEl.textContent = `${requestCount} request${requestCount !== 1 ? 's' : ''} detected`;
      
      // Add those requests to the list
      for (const req of requests) {
        addRequestEntry(req.method, req.url);
      }
    } else {
      requestCountEl.textContent = "No requests detected yet";
      // Show login message if no requests found
      setTimeout(() => {
        if (requestCount === 0) {
          addLoginMessage();
        }
      }, 1000);
    }

    // Intercept fetch requests for new ones
    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
      const url = (typeof input === 'string') ? input : input?.url;
      
      // Call the original fetch
      const p = originalFetch.apply(this, arguments);
      
      // Check if this is a Supabase request
      if (url && url.includes(baseUrl)) {
        // Skip our own verification requests
        if (!isVerificationRequest(url)) {
          requestCount++;
          updateRequestCount();
          
          // Check for table names in the URL
          if (url.includes('/rest/v1/')) {
            const parts = url.split('/rest/v1/');
            if (parts.length > 1) {
              const pathPart = parts[1].split('?')[0].split('/')[0];
              if (pathPart && pathPart !== 'auth') {
                // Note: we only visually add the table - the actual existence
                // is verified separately in verifyTablesAndCheckRLS
              }
            }
          }
          
          // Intercept and capture the response
          p.then(function(response) {
            try {
              const method = (init && init.method) ? init.method : 'GET';
              addRequestEntry(method, url);
              
              // Clone the response and extract the JSON data
              const clonedResponse = response.clone();
              clonedResponse.json().then(data => {
                capturedResponses.set(url, data);
                addResponseEntry(url, data);
              }).catch(() => {
                // Not JSON data, ignore
              });
            } catch (e) {}
          });
        }
      }
      
      return p;
    };

    // Intercept XMLHttpRequest
    const originalXhrOpen = XMLHttpRequest.prototype.open;
    const originalXhrSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method, url) {
      if (url && url.includes(baseUrl)) {
        this._supaRequestUrl = url;
        this._supaRequestMethod = method;
        
        // Skip our own verification requests
        if (!isVerificationRequest(url)) {
          // Check for table names in the URL
          if (url.includes('/rest/v1/')) {
            const parts = url.split('/rest/v1/');
            if (parts.length > 1) {
              const pathPart = parts[1].split('?')[0].split('/')[0];
              if (pathPart && pathPart !== 'auth') {
                // Note: we only visually add the table - the actual existence
                // is verified separately in verifyTablesAndCheckRLS
              }
            }
          }
          
          const originalOnLoad = this.onload;
          this.onload = function() {
            requestCount++;
            updateRequestCount();
            addRequestEntry(method, url);
            
            // Try to parse the response as JSON
            try {
              if (this.responseType === '' || this.responseType === 'text') {
                const data = JSON.parse(this.responseText);
                capturedResponses.set(url, data);
                addResponseEntry(url, data);
              }
            } catch (e) {
              // Not JSON data, ignore
            }
            
            if (originalOnLoad) originalOnLoad.apply(this, arguments);
          };
        }
      }
      originalXhrOpen.apply(this, arguments);
    };
    
    XMLHttpRequest.prototype.send = function() {
      originalXhrSend.apply(this, arguments);
    };
    
    // Add a request entry to the list
    function addRequestEntry(method, url) {
      // Skip our own verification requests
      if (isVerificationRequest(url)) {
        return;
      }
      
      const endpoint = url.split('/').slice(3).join('/');
      
      // Avoid duplicates
      const existingRequests = document.querySelectorAll(`div[data-url="${url}"]`);
      if (existingRequests.length > 0) {
        return;
      }
      
      const requestEl = document.createElement('div');
      requestEl.style.cssText = `
        padding: 6px 8px;
        margin-bottom: 4px;
        background: #F9FAFB;
        border-radius: 4px;
        font-size: 12px;
        border-left: 3px solid #3B82F6;
        cursor: pointer;
      `;
      requestEl.dataset.url = url;
      
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
      
      // Make request entry clickable to show response
      requestEl.onclick = () => {
        // Focus on the response section if we have a response
        if (capturedResponses.has(url)) {
          const id = url.replace(/[^a-zA-Z0-9]/g, '-');
          const responseEl = document.getElementById(`json-container-${id}`);
          if (responseEl) {
            responseEl.scrollIntoView({ behavior: 'smooth' });
            
            // Highlight the entry by flashing it
            const originalBackground = responseEl.style.background;
            responseEl.style.background = '#FDE68A';
            setTimeout(() => {
              responseEl.style.background = originalBackground;
            }, 1000);
          }
        }
      };
      
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
    
    return allTables; // Return all discovered tables
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
      
      // Start monitoring network requests and discover tables
      const discoveredTables = monitorNetworkRequests(supabaseUrl);
      
      // Verify tables and check RLS
      const { rlsConfigured, existingTables } = await verifyTablesAndCheckRLS(supabaseUrl, supabaseKey, discoveredTables);
      addStatusItem('Row Level Security', rlsConfigured ? 'Configured' : 'Not Configured', rlsConfigured);
    } else {
      addStatusItem('Supabase', 'Not Found', true);
    }
  }

  runChecks();
})(); 