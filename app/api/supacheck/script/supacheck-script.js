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
    
    // Updated Regex for Supabase Anon Key (JWT format)
    // Looks for patterns like: eyJ... or variable assignments
    const keyPattern = /(['"]?(?:supabaseKey|apiKey)['"]?\s*[:=]\s*['"]|['"])(eyJ[a-zA-Z0-9._-]+)['"]/gi;
    
    let keyMatch;
    while ((keyMatch = keyPattern.exec(content)) !== null) {
      // The actual key is in the second capture group
      if (keyMatch[2] && keyMatch[2].length > 50) { // Basic length check for JWT
        foundKey = keyMatch[2];
        // If we already found a URL, we can return now
        if (foundUrl) {
          return { url: foundUrl, key: foundKey };
        }
        // Keep searching in case we find the URL later
        break; // Found a key, stop looking for more keys for now
      }
    }

    // If we found a URL but not a key yet, search near the URL again with a simpler pattern
    if (urlMatches.length > 0 && !foundKey) {
      foundUrl = urlMatches[0];
      // Look for JWT keys potentially near the URL (broader search)
      const nearbyKeyPattern = /(eyJ[a-zA-Z0-9._-]{40,})/g; // Simpler JWT search
      const nearbyKeyMatches = content.match(nearbyKeyPattern) || [];
      
      if (nearbyKeyMatches.length > 0) {
        // Find the key closest to the URL? For now, just take the first valid one.
        foundKey = nearbyKeyMatches.find(key => key.split('.').length === 3); // Ensure it looks like JWT
      }
    }
    
    // Return if we found both URL and Key
    if (foundUrl && foundKey) {
      return { url: foundUrl, key: foundKey };
    }
    
    // If only key found so far, keep searching for URL if not found yet
    if (foundKey && !foundUrl && urlMatches.length > 0) {
       return { url: urlMatches[0], key: foundKey };
    }

    // Fallback: If only URL was found, return null for key
    if (urlMatches.length > 0 && !foundKey) {
      return { url: urlMatches[0], key: null }; // Indicate URL found, but no key
    }

    // Fallback: If only Key was found, but no URL
    if (foundKey && !foundUrl) {
      // We cannot proceed without a URL, so treat as not found
      // Or should we try a default URL? For now, return null.
      return null;
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
    header.textContent = 'SecureVibing Supacheck';
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

  // Keep track of Supabase credentials globally
  window._supabaseAnonKey = null;

  // Store original requests to extract headers directly
  const originalRequests = new Map();

  // Store captured auth tokens from requests
  const capturedAuthTokens = new Map();

  // ---> NEW: Global storage for JWT and discovered tables
  window._currentUserJwt = null;
  window._discoveredTableNames = new Set();
  // <--- END NEW

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
    
    // Create complete table data section
    createCompleteTableDataSection();
    
    return responseContainer;
  }
  
  // Create a section specifically for complete table data
  function createCompleteTableDataSection() {
    const sectionEl = document.createElement('div');
    sectionEl.id = 'supabase-complete-data-section';
    sectionEl.style.cssText = `
      margin-top: 15px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
    `;
    
    const titleEl = document.createElement('div');
    titleEl.textContent = 'Complete Table Data';
    titleEl.style.cssText = `
      font-weight: bold;
      margin-bottom: 10px;
    `;
    
    const tableDataContainer = document.createElement('div');
    tableDataContainer.id = 'supabase-complete-data';
    
    sectionEl.appendChild(titleEl);
    sectionEl.appendChild(tableDataContainer);
    contentEl.appendChild(sectionEl);
    
    // Add info message
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
    messageEl.innerHTML = "We'll use detected authentication tokens to fetch and display complete table data.<br><br>" +
      "When Supabase requests are detected, we'll automatically query the same tables to show all accessible columns and data.";
    
    tableDataContainer.appendChild(messageEl);
    
    return tableDataContainer;
  }

  // Create modal for the Fix Table feature
  function createFixTableModal() {
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'supacheck-modal-overlay';
    modalOverlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.5); z-index: 10000; display: none;
      align-items: center; justify-content: center;
    `;
    
    const modal = document.createElement('div');
    modal.id = 'supacheck-fix-modal';
    modal.style.cssText = `
      background: white; border-radius: 8px; width: 90%; max-width: 600px;
      max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
      display: flex; flex-direction: column; position: relative;
    `;
    
    const modalHeader = document.createElement('div');
    modalHeader.style.cssText = `
      padding: 16px; border-bottom: 1px solid #e2e8f0; background: #3182ce;
      color: white; font-weight: bold; display: flex; justify-content: space-between;
      align-items: center; border-top-left-radius: 8px; border-top-right-radius: 8px;
    `;
    
    const modalTitle = document.createElement('div');
    modalTitle.id = 'supacheck-modal-title';
    modalTitle.textContent = 'Restrict Columns Updates';
    
    const closeButton = document.createElement('span');
    closeButton.textContent = '×';
    closeButton.style.cssText = 'cursor: pointer; font-size: 24px;';
    closeButton.onclick = () => {
      modalOverlay.style.display = 'none';
    };
    
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);
    
    const modalContent = document.createElement('div');
    modalContent.id = 'supacheck-modal-content';
    modalContent.style.cssText = 'padding: 16px; flex-grow: 1;';
    
    const columnsContainer = document.createElement('div');
    columnsContainer.id = 'supacheck-columns-container';
    columnsContainer.style.cssText = 'margin-bottom: 16px;';
    
    const instructionsEl = document.createElement('div');
    instructionsEl.style.cssText = 'margin-bottom: 16px; color: #4b5563;';
    instructionsEl.innerHTML = 'Check the columns you want to limit users from updating:';
    
    const modalFooter = document.createElement('div');
    modalFooter.style.cssText = 'padding: 16px; border-top: 1px solid #e2e8f0; text-align: right;';
    
    const generateButton = document.createElement('button');
    generateButton.id = 'supacheck-generate-button';
    generateButton.textContent = 'Show me the fix';
    generateButton.style.cssText = `
      background: #3182ce; color: white; padding: 8px 16px; border: none;
      border-radius: 4px; cursor: pointer; font-weight: bold;
    `;
    generateButton.onclick = generateRLSPolicy;
    
    modalContent.appendChild(instructionsEl);
    modalContent.appendChild(columnsContainer);
    
    const resultContainer = document.createElement('div');
    resultContainer.id = 'supacheck-result-container';
    resultContainer.style.display = 'none';
    modalContent.appendChild(resultContainer);
    
    modalFooter.appendChild(generateButton);
    
    modal.appendChild(modalHeader);
    modal.appendChild(modalContent);
    modal.appendChild(modalFooter);
    
    modalOverlay.appendChild(modal);
    document.body.appendChild(modalOverlay);
    
    return modalOverlay;
  }
  
  // Store current table data for the modal
  let currentFixTableData = {
    tableName: null,
    columns: []
  };
  
  // Generate RLS Policy based on selected columns
  function generateRLSPolicy() {
    const columnsContainer = document.getElementById('supacheck-columns-container');
    const resultContainer = document.getElementById('supacheck-result-container');
    const tableName = currentFixTableData.tableName;
    
    // Get checked columns
    const checkboxes = columnsContainer.querySelectorAll('input[type="checkbox"]:checked');
    const selectedColumns = Array.from(checkboxes).map(cb => cb.value);
    
    if (selectedColumns.length === 0) {
      alert('Please select at least one column to restrict');
      return;
    }
    
    // Build policy
    const conditions = selectedColumns.map(column => 
      `    ${column} = (SELECT ${column} FROM public.${tableName} WHERE id = auth.uid())`
    ).join(' AND\n');
    
    const policy = `CREATE POLICY "Users can update non-sensitive ${tableName} fields"
  ON public.${tableName}
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
${conditions}
  );`;
    
    // Display results
    resultContainer.style.display = 'block';
    resultContainer.innerHTML = `
      <div style="margin: 20px 0; border-top: 1px solid #e2e8f0; padding-top: 20px;">
        <h3 style="font-weight: bold; margin-bottom: 10px;">Follow these steps:</h3>
        <ol style="margin-left: 20px; line-height: 1.5;">
          <li>Go to your Supabase project</li>
          <li>Go to SQL Editor</li>
          <li>Run this auth policy for your table:</li>
        </ol>
        <div style="background: #f1f5f9; padding: 16px; border-radius: 4px; margin-top: 10px; overflow-x: auto;">
          <pre style="margin: 0; white-space: pre-wrap; font-family: monospace;">${policy}</pre>
        </div>
      </div>
    `;
    
    // Scroll to the result
    resultContainer.scrollIntoView({ behavior: 'smooth' });
  }
  
  // Fetch columns for a table
  async function fetchTableColumns(baseUrl, tableName, apiKey) {
    const columnsContainer = document.getElementById('supacheck-columns-container');
    columnsContainer.innerHTML = '<div style="text-align: center;">Loading columns...</div>';
    
    // Try first with JWT if available
    if (window._currentUserJwt) {
      try {
        console.log(`[Column Discovery] Attempting to fetch columns for '${tableName}' using JWT token...`);
        const sampleUrl = `${baseUrl}/rest/v1/${tableName}?limit=1`;
        const response = await fetch(sampleUrl, {
          headers: {
            'apikey': apiKey,
            'Authorization': `Bearer ${window._currentUserJwt}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            console.log(`[Column Discovery] Successfully retrieved columns using JWT for '${tableName}'`);
            const columns = Object.keys(data[0]);
            displayColumns(columns);
            return; // Success with JWT, exit function
          }
        }
        // If we get here, the JWT approach failed - continue to API key approach
        console.log(`[Column Discovery] JWT approach failed for '${tableName}', trying API key approach...`);
      } catch (e) {
        console.error(`[Column Discovery] Error with JWT approach for '${tableName}':`, e);
        // Continue to API key approach
      }
    }
    
    // Original approach - try with API key as bearer token
    try {
      console.log(`[Column Discovery] Attempting to fetch columns for '${tableName}' using API key...`);
      const sampleUrl = `${baseUrl}/rest/v1/${tableName}?limit=1`;
      const response = await fetch(sampleUrl, {
        headers: {
          'apikey': apiKey,
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      if (!response.ok) {
        console.error(`[Column Discovery] API key approach failed with status ${response.status} for '${tableName}'`);
        throw new Error(`Failed to fetch sample data: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        // We have a row, get columns from it
        console.log(`[Column Discovery] Successfully retrieved columns using API key for '${tableName}'`);
        const columns = Object.keys(data[0]);
        displayColumns(columns);
      } else {
        // No data, try to introspect using Supabase's introspection API
        // This is a fallback and might not work depending on API configuration
        console.error(`[Column Discovery] No data available for column extraction from '${tableName}'`);
        throw new Error('No data available to extract columns');
      }
    } catch (error) {
      console.error(`[Column Discovery] Final error fetching columns for '${tableName}':`, error);
      columnsContainer.innerHTML = `
        <div style="color: #ef4444; padding: 10px;">
          Could not retrieve columns automatically. Please enter them manually:
        </div>
        <div style="margin-top: 10px; color: #6b7280; font-size: 12px;">
          <p>This may happen if:</p>
          <ul style="list-style-type: disc; margin-left: 20px; margin-top: 5px;">
            <li>The table is empty (no rows to analyze)</li>
            <li>Row Level Security (RLS) is blocking access</li>
            <li>The table exists but you don't have permission to view it</li>
          </ul>
        </div>
        <div style="margin-top: 10px;">
          <textarea id="columns-manual-input" style="width: 100%; height: 100px; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;" 
            placeholder="Enter column names, one per line"></textarea>
        </div>
        <div style="margin-top: 10px;">
          <button id="add-manual-columns" style="background: #3182ce; color: white; padding: 4px 8px; border: none; border-radius: 4px; cursor: pointer;">
            Add Columns
          </button>
        </div>
      `;
      
      // Set up button for manual column entry
      document.getElementById('add-manual-columns').onclick = () => {
        const manualInput = document.getElementById('columns-manual-input').value;
        const columns = manualInput.split('\n')
          .map(col => col.trim())
          .filter(col => col.length > 0);
        
        if (columns.length > 0) {
          displayColumns(columns);
        } else {
          alert('Please enter at least one column name');
        }
      };
    }
  }
  
  // Display columns as checkboxes
  function displayColumns(columns) {
    const columnsContainer = document.getElementById('supacheck-columns-container');
    columnsContainer.innerHTML = '';
    
    const nonUpdatableFields = ['id', 'created_at', 'updated_at'];
    currentFixTableData.columns = columns;
    
    columns.forEach(column => {
      const isNonUpdatable = nonUpdatableFields.includes(column);
      
      const checkboxContainer = document.createElement('div');
      checkboxContainer.style.cssText = 'margin-bottom: 8px; display: flex; align-items: center;';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `column-${column}`;
      checkbox.value = column;
      checkbox.style.marginRight = '8px';
      
      // Pre-check common sensitive fields
      const sensitiveFields = ['email', 'password', 'credits', 'role', 'subscription_tier', 'is_admin'];
      if (sensitiveFields.includes(column)) {
        checkbox.checked = true;
      }
      
      // Disable checkbox for non-updatable fields
      if (isNonUpdatable) {
        checkbox.disabled = true;
        checkbox.checked = false;
      }
      
      const label = document.createElement('label');
      label.htmlFor = `column-${column}`;
      label.textContent = column;
      if (isNonUpdatable) {
        label.style.color = '#9ca3af';
        label.title = 'This field is typically not updatable';
      }
      
      checkboxContainer.appendChild(checkbox);
      checkboxContainer.appendChild(label);
      columnsContainer.appendChild(checkboxContainer);
    });
    
    // Reset result container
    const resultContainer = document.getElementById('supacheck-result-container');
    resultContainer.style.display = 'none';
    resultContainer.innerHTML = '';
  }
  
  // Show modal with table columns
  function showFixTableModal(tableName, baseUrl, apiKey) {
    const modalOverlay = document.getElementById('supacheck-modal-overlay') || createFixTableModal();
    const modalTitle = document.getElementById('supacheck-modal-title');
    
    modalTitle.textContent = `Restrict Column Updates for "${tableName}"`;
    modalOverlay.style.display = 'flex';
    
    // Store current table
    currentFixTableData.tableName = tableName;
    
    // Reset the result container
    const resultContainer = document.getElementById('supacheck-result-container');
    if (resultContainer) {
      resultContainer.style.display = 'none';
      resultContainer.innerHTML = '';
    }
    
    // Fetch columns for the table
    fetchTableColumns(baseUrl, tableName, apiKey);
  }

  // Add a table entry to the list
  function addTableEntry(tableName, endpoint) {
    const tablesContainer = document.getElementById('supabase-tables');
    if (!tablesContainer) return;
    
    // Check if this table is already listed
    if (document.getElementById(`table-${tableName}`)) {
      return; // Already added
    }
    
    // ---> NEW: Add to global set and check for existing JWT
    window._discoveredTableNames.add(tableName);
    console.log(`[Discovery] Added '${tableName}' to discovered tables.`);
    if (window._currentUserJwt) {
      console.log(`[Discovery] JWT already known. Triggering auth fetch for '${tableName}'...`);
      const supabaseUrl = endpoint.split('/rest/v1/')[0]; // Extract base URL
      fetchAndDisplayAuthData(supabaseUrl, tableName, window._currentUserJwt, window._supabaseAnonKey);
    }
    // <--- END NEW
    
    const tableEl = document.createElement('div');
    tableEl.id = `table-${tableName}`;
    tableEl.style.cssText = `
      padding: 6px 8px;
      margin-bottom: 4px;
      background: #F9FAFB;
      border-radius: 4px;
      font-size: 12px;
      border-left: 3px solid #22C55E;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    
    const tableInfoEl = document.createElement('div');
    tableInfoEl.style.flexGrow = '1';
    
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
    
    // Add Fix Table button
    const fixTableBtn = document.createElement('button');
    fixTableBtn.textContent = 'Fix Table';
    fixTableBtn.style.cssText = `
      background-color: #22C55E;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 11px;
      cursor: pointer;
      margin-left: 8px;
      white-space: nowrap;
    `;
    
    // Set up click handler
    fixTableBtn.onclick = (e) => {
      e.stopPropagation(); // Prevent event bubbling
      const baseUrl = endpoint.split('/rest/v1/')[0];
      showFixTableModal(tableName, baseUrl, window._supabaseAnonKey);
    };
    
    tableInfoEl.appendChild(tableNameEl);
    tableInfoEl.appendChild(endpointEl);
    tableEl.appendChild(tableInfoEl);
    tableEl.appendChild(fixTableBtn);
    tablesContainer.appendChild(tableEl);
  }

  // Create a section for Authenticated Data
  function createAuthDataSection() {
    const sectionEl = document.createElement('div');
    sectionEl.id = 'supabase-auth-data-section';
    sectionEl.style.cssText = `
      margin-top: 15px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
    `;
    
    const titleEl = document.createElement('div');
    titleEl.textContent = 'Authenticated Data Access';
    titleEl.style.cssText = `
      font-weight: bold;
      margin-bottom: 10px;
    `;
    
    const authDataContainer = document.createElement('div');
    authDataContainer.id = 'supabase-auth-data';
    
    sectionEl.appendChild(titleEl);
    sectionEl.appendChild(authDataContainer);
    contentEl.appendChild(sectionEl);

    // Add info message by default
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
    messageEl.innerHTML = "When authenticated requests are detected, we'll try to fetch data using the user's token and display it here.";
    authDataContainer.appendChild(messageEl);
    
    return authDataContainer;
  }

  // Add an entry to the authenticated data section
  function addAuthDataEntry(url, data, tableName) {
    const authDataContainer = document.getElementById('supabase-auth-data');
    if (!authDataContainer) return;
    
    // Remove any info message if it exists
    const infoMessage = authDataContainer.querySelector('div[style*="background: #EFF6FF"]');
    if (infoMessage) {
      authDataContainer.removeChild(infoMessage);
    }
    
    // Generate a unique ID for this table's auth data
    const id = `auth-data-${tableName}`;
    
    // Remove existing entry for this table if present (to update)
    const existingViewer = document.getElementById(`json-container-${id}`);
    if (existingViewer) {
      authDataContainer.removeChild(existingViewer);
    }
    
    // Create a title for the viewer
    let title = `Auth Data: ${tableName}`;
    if (Array.isArray(data)) {
      title += ` (${data.length} row${data.length !== 1 ? 's' : ''})`;
    } else if (data && (data.error || data.code || data.message)) {
      title += ` (Error)`;
    }
    
    // Create the JSON viewer
    const jsonViewer = createJsonViewer(id, data, url, title);
    if (jsonViewer) {
       // Add a different style to distinguish it
      jsonViewer.style.border = '2px solid #10B981'; // Green border
      jsonViewer.style.boxShadow = '0 4px 6px rgba(16, 185, 129, 0.1)';
      
      authDataContainer.appendChild(jsonViewer);
    }
  }

  // Create a collapsible JSON viewer
  function createJsonViewer(id, data, endpoint, title = null) {
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
      background: ${title ? '#E0F2FE' : '#EBF5FF'};
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
    
    // If we have a title, display it instead of just the endpoint
    if (title) {
      endpointText.innerHTML = `<span style="color: #3B82F6;">${title}</span><br><span style="font-size: 11px; color: #64748B;">${endpointPath}</span>`;
    } else {
      endpointText.textContent = endpointPath;
    }
    
    endpointText.style.overflow = 'hidden';
    endpointText.style.textOverflow = 'ellipsis';
    endpointText.style.whiteSpace = title ? 'normal' : 'nowrap';
    
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
      max-height: 250px; /* Slightly shorter */
      overflow-y: auto;
      background: #ffffff; /* White background */
    `;
    
    // ---> NEW: Handle Authenticated Data View differently
    const isAuthDataView = id.startsWith('auth-data-');
    let primaryKeyColumn = 'id'; // Assume 'id' is the primary key
    let primaryKeyValue = null;

    // Extract the first data object if it's an array (common for RLS queries)
    const dataObject = Array.isArray(data) ? (data.length > 0 ? data[0] : null) : data;

    if (isAuthDataView && dataObject && typeof dataObject === 'object') {
        primaryKeyValue = dataObject[primaryKeyColumn];
        // Clear default padding and background for table rows
        contentEl.style.padding = '0';
        contentEl.style.background = '#ffffff';
        
        const tableEl = document.createElement('table');
        tableEl.style.cssText = `
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        `;

        // Get Base URL from endpoint for PATCH requests
        const baseUrl = extractBaseUrl(endpoint);
        const tableName = title ? title.split(': ')[1]?.split(' (')[0] : null;

        if (!primaryKeyValue) {
           console.warn("[Auth View] Could not determine primary key value for table:", tableName);
        }

        Object.entries(dataObject).forEach(([key, value]) => {
            const rowEl = document.createElement('tr');
            rowEl.style.borderBottom = '1px solid #f3f4f6';

            const keyEl = document.createElement('td');
            keyEl.style.cssText = `
                padding: 8px 10px;
                font-weight: 500;
                width: 40%;
                word-break: break-all;
                vertical-align: middle;
                border-right: 1px solid #f3f4f6;
            `;
            keyEl.textContent = key;

            const valueCellEl = document.createElement('td');
            valueCellEl.style.cssText = 'padding: 8px 10px; word-break: break-all; display: flex; justify-content: space-between; align-items: center;';
            
            const valueText = document.createElement('span');
            valueText.textContent = formatValueForDisplay(value); // Use helper for display
            valueText.style.flexGrow = '1';
            valueText.style.marginRight = '10px';
            
            valueCellEl.appendChild(valueText);

            // Add Test button for updatable fields if we have necessary info
            const nonUpdatableFields = [primaryKeyColumn, 'email', 'created_at', 'updated_at', 'user_id']; // Fields to exclude from testing
            if (baseUrl && tableName && primaryKeyValue && !nonUpdatableFields.includes(key)) {
                const buttonEl = document.createElement('button');
                buttonEl.textContent = 'Test';
                buttonEl.style.cssText = `
                    padding: 2px 6px; 
                    font-size: 10px; 
                    cursor: pointer; 
                    border: 1px solid #9ca3af;
                    background: #f9fafb;
                    border-radius: 4px;
                    color: #374151;
                    margin-left: auto; /* Push to the right */
                    flex-shrink: 0;
                `;
                buttonEl.dataset.baseUrl = baseUrl;
                buttonEl.dataset.tableName = tableName;
                buttonEl.dataset.primaryKeyColumn = primaryKeyColumn;
                buttonEl.dataset.primaryKeyValue = primaryKeyValue;
                buttonEl.dataset.columnName = key;
                buttonEl.dataset.originalValue = JSON.stringify(value); // Store original value as string
                
                buttonEl.onclick = handleTestUpdateClick;

                const statusEl = document.createElement('span'); // Placeholder for results
                statusEl.id = `test-status-${tableName}-${key}-${primaryKeyValue}`;
                statusEl.style.cssText = 'font-size: 10px; margin-left: 5px; flex-shrink: 0;';

                valueCellEl.appendChild(buttonEl);
                valueCellEl.appendChild(statusEl);
            }

            rowEl.appendChild(keyEl);
            rowEl.appendChild(valueCellEl);
            tableEl.appendChild(rowEl);
        });

        contentEl.appendChild(tableEl);

    } 
    // ---> Default rendering for non-auth data or errors
    else if (data.error || data.code || (data.message && (data.statusCode || data.status))) {
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
  function addResponseEntry(url, data, title = null) {
    const responsesContainer = document.getElementById('supabase-responses');
    if (!responsesContainer) return;
    
    // Remove any info message if it exists
    const infoMessage = responsesContainer.querySelector('div[style*="background: #EFF6FF"]');
    if (infoMessage) {
      responsesContainer.removeChild(infoMessage);
    }
    
    // Generate a unique ID for this response
    const id = url.replace(/[^a-zA-Z0-9]/g, '-') + (title ? `-${title.replace(/[^a-zA-Z0-9]/g, '-')}` : '');
    
    // Skip if we already have this response
    if (document.getElementById(`json-container-${id}`)) {
      return;
    }
    
    // Create the JSON viewer
    const jsonViewer = createJsonViewer(id, data, url, title);
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
        
        // Store the key used for verification to reuse later
        window._supabaseAnonKey = supabaseKey;
        
        // Also track the headers we're using for verification
        window._lastVerificationHeaders = {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        };
        
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
            console.log(`[Verification] Table '${table}' exists (Status 200). Checking RLS...`); // Log success
            const data = await response.json();
            // This table exists - add it to our UI
            existingTables.add(table);
            addTableEntry(table, verificationUrl);
            
            // Check RLS while we're at it
            if (Array.isArray(data) && data.length > 0) { // Changed from data.length > 1
              anyTableWithDisabledRLS = true;
              console.log(`[Verification] RLS potentially NOT configured for '${table}'. Anon key fetched ${data.length} rows.`); // Log potential issue
            }
          } else {
             console.log(`[Verification] Table '${table}' check failed (Status ${response.status})`); // Log failure
          }
        } catch (tableError) {
           console.error(`[Verification] Error checking table '${table}':`, tableError); // Log error
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
    
    // Store the key globally for other functions to use
    if (finalSupabaseKey) {
      window._supabaseAnonKey = finalSupabaseKey;
    }

    return { supabaseUrl: finalSupabaseUrl, supabaseKey: finalSupabaseKey };
  }

  // Monitor network requests to Supabase
  function monitorNetworkRequests(supabaseUrl) {
    let requestCount = 0;
    const requestsContainer = createNetworkSection();
    const baseUrl = supabaseUrl.replace(/^https?:\/\//, '');
    
    // Create the tables section
    createTablesSection();

    // Create the authenticated data section
    createAuthDataSection();
    
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
      let extractedAuthToken = null;
      let extractedApiKey = window._supabaseAnonKey; // Start with global key
      let extractedTableName = null;
      
      // Extract auth token and apikey from request headers if available
      if (url && url.includes(baseUrl) && url.includes('/rest/v1/')) {
        extractedTableName = extractTableNameFromUrl(url);
        
        if (init && init.headers) {
          // Store original headers for this URL if it's a table request
          if (extractedTableName) {
            originalRequests.set(extractedTableName, {...init});
          }
          
          // Handle different header formats
          let headersToCheck = {};
          if (init.headers instanceof Headers) {
             init.headers.forEach((value, key) => {
               headersToCheck[key.toLowerCase()] = value;
             });
          } else if (typeof init.headers === 'object') {
             Object.entries(init.headers).forEach(([key, value]) => {
               headersToCheck[key.toLowerCase()] = value;
             });
          }

          const authHeader = headersToCheck['authorization'];
          if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
            extractedAuthToken = authHeader.substring(7);
            // ---> NEW: Log captured token
            console.log("[Intercept Fetch] Raw extracted token:", extractedAuthToken);
            // <--- END NEW
            // Verify it looks like a JWT token
            if (!looksLikeJWT(extractedAuthToken)) {
               console.warn("Captured Authorization header doesn't look like a JWT token:", extractedAuthToken.substring(0, 10) + '...');
               // Don't nullify here, let comparison logic handle it
            } else if (extractedAuthToken === window._supabaseAnonKey) {
               console.log("[Intercept Fetch] Authorization header contains the anon key. Ignoring for user auth data.");
               // Don't nullify here, just prevents setting _currentUserJwt later
            }
          }
          
          // Capture the apikey if present in this specific request
          const apiKeyHeader = headersToCheck['apikey'];
          if (apiKeyHeader) {
             extractedApiKey = apiKeyHeader;
             window._supabaseAnonKey = apiKeyHeader; // Update global key too
          }
        }
      }
      
      // Call the original fetch
      const p = originalFetch.apply(this, arguments);
      
      // Check if this is a Supabase request
      if (url && url.includes(baseUrl)) {
        console.log(`[Intercept Fetch] Detected Supabase URL: ${url}`); // Log detected URL
        // Skip our own verification requests
        if (!isVerificationRequest(url)) {
          requestCount++;
          updateRequestCount();
          
          // Intercept and capture the response
          p.then(function(response) {
            try {
              const method = (init && init.method) ? init.method : 'GET';
              addRequestEntry(method, url); // Add to network list
              
              // Clone the response to read data without consuming it
              const clonedResponse = response.clone();
              clonedResponse.json().then(data => {
                // ---> REFINED LOGIC: Only trigger fetch if we have a *user* JWT (different from anon key)
                if (extractedAuthToken && extractedAuthToken !== window._supabaseAnonKey && extractedApiKey) {
                  // Check if this is a *new* user JWT we haven't seen
                  if (window._currentUserJwt !== extractedAuthToken) {
                     console.log(`[Intercept Fetch] Captured valid NEW USER JWT via header. Storing globally.`);
                     window._currentUserJwt = extractedAuthToken;
                     
                     // Now try fetching for all known discovered tables with this NEW token
                     console.log(`[Intercept Fetch] Triggering auth fetch for all discovered tables (${Array.from(window._discoveredTableNames).join(', ') || 'none'})...`);
                     const requestBaseUrl = extractBaseUrl(url) || (window._supabaseUrl ? window._supabaseUrl.split('/rest/v1/')[0] : null); // Get base URL reliably
                     if (requestBaseUrl) {
                         window._discoveredTableNames.forEach(discoveredTable => {
                           fetchAndDisplayAuthData(requestBaseUrl, discoveredTable, window._currentUserJwt, extractedApiKey);
                         });
                     }
                  } else {
                     console.log("[Intercept Fetch] Captured JWT via header matches existing _currentUserJwt. No new fetch triggered.")
                  }
                }
              }).catch(() => {
                // Not JSON data, ignore
              });
            } catch (e) { console.error("Error in fetch intercept:", e); }
          });
        }
      }
      
      return p;
    };

    // Intercept XMLHttpRequest
    const originalXhrOpen = XMLHttpRequest.prototype.open;
    const originalXhrSend = XMLHttpRequest.prototype.send;
    const originalXhrSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
    
    XMLHttpRequest.prototype.open = function(method, url) {
      this._supaRequestUrl = null; // Reset flags
      this._supaRequestMethod = null;
      this._supaRequestHeaders = {};
      this._supaTableName = null;

      if (url && url.includes(baseUrl) && url.includes('/rest/v1/')) {
        // Skip our own verification requests
        if (!isVerificationRequest(url)) {
          this._supaRequestUrl = url;
          this._supaRequestMethod = method;
          // Check for table names in the URL
          this._supaTableName = extractTableNameFromUrl(url);
        }
      }
      originalXhrOpen.apply(this, arguments);
    };
    
    XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
      // Capture auth token and apikey from headers if this is a tracked Supabase request
      if (this._supaRequestUrl) {
         const lowerCaseName = name.toLowerCase();
         if (lowerCaseName === 'authorization') {
            if (value && typeof value === 'string' && value.toLowerCase().startsWith('bearer ')) {
              const token = value.substring(7);
              // ---> NEW: Log captured token
              console.log("[Intercept XHR] Raw extracted token:", token);
              // <--- END NEW
              if (looksLikeJWT(token)) {
                 if (token === window._supabaseAnonKey) {
                    console.log("[Intercept XHR] Authorization header contains the anon key. Ignoring for user auth data.");
                    // Clear the potential token for this request
                    delete this._supaRequestHeaders.authorization; 
                 } else {
                    // It's a valid JWT and NOT the anon key - assume it's the user token
                    this._supaRequestHeaders.authorization = token;
                 }
              } else {
                 console.warn("Captured XHR Authorization header doesn't look like a JWT token:", token.substring(0, 10) + '...');
              }
            }
         } else if (lowerCaseName === 'apikey') {
            this._supaRequestHeaders.apikey = value;
            window._supabaseAnonKey = value; // Update global key too
         }
      }
      originalXhrSetRequestHeader.apply(this, arguments);
    };
    
    XMLHttpRequest.prototype.send = function() {
       // Add listener just before sending, if this is a tracked request
      if (this._supaRequestUrl && this._supaTableName) {
          const originalOnLoad = this.onload;
          this.onload = function() {
            requestCount++;
            updateRequestCount();
            addRequestEntry(this._supaRequestMethod || 'GET', this._supaRequestUrl); // Add to network list
            
            // Try to parse the response as JSON
            try {
              if (this.responseType === '' || this.responseType === 'text') {
                 // We have table, check if we captured headers
                 const authToken = this._supaRequestHeaders.authorization;
                 const apiKey = this._supaRequestHeaders.apikey || window._supabaseAnonKey; // Use specific or global fallback
                 
                 if (authToken && apiKey && this._supaTableName) {
                     // ---> REFINED LOGIC: authToken here should already be vetted (not anon key)
                     console.log(`[Intercept XHR] Captured valid USER JWT. Storing globally.`);
                     window._currentUserJwt = authToken;
                     
                     // Now try fetching for all known discovered tables
                     console.log(`[Intercept XHR] Triggering auth fetch for all discovered tables (${Array.from(window._discoveredTableNames).join(', ') || 'none'})...`);
                     const requestBaseUrl = extractBaseUrl(this._supaRequestUrl);
                     if (requestBaseUrl) {
                         window._discoveredTableNames.forEach(discoveredTable => {
                           fetchAndDisplayAuthData(requestBaseUrl, discoveredTable, window._currentUserJwt, apiKey);
                         });
                     }
                    // <--- END REFINED LOGIC
                 }
              }
            } catch (e) { console.error("Error in XHR intercept:", e); }
            
            if (originalOnLoad) originalOnLoad.apply(this, arguments);
          };
      }
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

  // Extract table name from URL
  function extractTableNameFromUrl(url) {
    if (url.includes('/rest/v1/')) {
      const parts = url.split('/rest/v1/');
      if (parts.length > 1) {
        const pathPart = parts[1].split('?')[0].split('/')[0];
        if (pathPart && pathPart !== 'auth') {
          return pathPart;
        }
      }
    }
    return null;
  }

  // Extract base URL from a full Supabase URL
  function extractBaseUrl(url) {
    if (url.includes('/rest/v1/')) {
      return url.split('/rest/v1/')[0];
    }
    return null;
  }

  // Function to fetch data from a table using captured user credentials
  async function fetchAndDisplayAuthData(baseUrl, tableName, token, apikey) {
    // Ensure we have all necessary parts
    if (!baseUrl || !tableName || !token || !apikey) {
      console.warn("Attempted fetchAndDisplayAuthData with missing parameters:", { baseUrl, tableName, token_present: !!token, apikey_present: !!apikey });
      return;
    }
    
    // Construct query URL (fetch limited rows initially)
    const queryUrl = `${baseUrl}/rest/v1/${tableName}?select=*&limit=20`; 
    
    // Skip if this is a verification request we initiated
    if (isVerificationRequest(queryUrl)) return; 
    
    // Add to our verification requests to avoid potential loops
    ourVerificationRequests.add(queryUrl);
    
    console.log(`Attempting to fetch authenticated data for '${tableName}'...`);
    
    try {
      const response = await fetch(queryUrl, {
        method: 'GET',
        headers: {
          'apikey': apikey,
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json' // Ensure we ask for JSON
        }
      });
      
      let responseData;
      if (response.ok) {
        responseData = await response.json();
        console.log(`✅ SUCCESS: Fetched authenticated data for '${tableName}' (${Array.isArray(responseData) ? responseData.length : 1} item(s))`);
      } else {
        // Try to get error message from response body
        let errorBody = `Status ${response.status}: ${response.statusText}`;
        try {
          const errorJson = await response.json();
          errorBody = errorJson.message || JSON.stringify(errorJson);
        } catch (e) { /* Ignore if response body is not JSON */ }
        
        console.error(`❌ FAILED: Fetching authenticated data for '${tableName}' failed. ${errorBody}`);
        responseData = { 
          error: `Failed to fetch data (Status ${response.status})`, 
          message: errorBody,
          details: `Ensure RLS policy allows access for the logged-in user with token: ${token.substring(0,5)}...`
        };
      }
      
      // Display the result (success or error)
      addAuthDataEntry(queryUrl, responseData, tableName);
      
    } catch (error) {
      console.error(`❌ FAILED: Network error fetching authenticated data for '${tableName}':`, error);
      addAuthDataEntry(queryUrl, { 
        error: "Network error during fetch", 
        message: String(error) 
      }, tableName);
    } finally {
      // Remove from verification set after completion/failure
      ourVerificationRequests.delete(queryUrl);
    }
  }

  // Helper function to determine if a string looks like a JWT token
  function looksLikeJWT(str) {
    // Check if string matches JWT format (three base64 sections separated by dots)
    return typeof str === 'string' && /^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+/=]*$/.test(str);
  }

  // ---> NEW: Function to find user JWT in cookies
  function findUserJwtInCookies() {
    try {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.split('=').map(c => c.trim());
        // Look for patterns like sb-...-auth-token or supabase.auth.token
        if (name.startsWith('sb-') && name.endsWith('-auth-token') || name === 'supabase.auth.token') {
          // Parse the cookie value if it's JSON
          try {
            const parsedValue = JSON.parse(decodeURIComponent(value));
            // ---> UPDATED: Check if it's an array and get the first element
            if (Array.isArray(parsedValue) && parsedValue.length > 0 && typeof parsedValue[0] === 'string') {
              const potentialToken = parsedValue[0];
              if (looksLikeJWT(potentialToken)) {
                // Compare against anon key to ensure it's the user JWT
                if (potentialToken !== window._supabaseAnonKey) {
                   console.log("[Cookies] Found user JWT in cookie array:", name);
                   return potentialToken;
                } else {
                   console.log("[Cookies] Found anon key in auth cookie array. Skipping.");
                }
              } else {
                 console.log("[Cookies] First element of auth cookie array is not a JWT:", name);
              }
            } else {
               console.log("[Cookies] Parsed auth cookie is not an array or first element isn't a string:", name);
            }
            // <--- END UPDATED
          } catch (e) {
            // Handle cases where the cookie value is just the token string (not JSON)
            // This path is less likely given the example, but keep as fallback
            const decodedValue = decodeURIComponent(value); // Decode first
            if (typeof decodedValue === 'string' && looksLikeJWT(decodedValue) && decodedValue !== window._supabaseAnonKey) {
               console.log("[Cookies] Found raw user JWT string in cookie (after decode):", name);
               return decodedValue;
            }
          }
        }
      }
    } catch (error) {
      console.error("[Cookies] Error reading cookies:", error);
    }
    console.log("[Cookies] No user JWT found in cookies.");
    return null;
  }
  // <--- END NEW

  // Main execution
  async function runChecks() {
    const loadingEl = showLoading();
    
    // Find Supabase credentials
    const { supabaseUrl, supabaseKey } = await findSupabaseCredentials();
    
    // Store globally for reference
    window._supabaseUrl = supabaseUrl;
    window._supabaseAnonKey = supabaseKey; 

    // Clear loading indicator
    hideLoading();
    
    // Display Supabase status
    if (supabaseUrl && supabaseKey) {
      addStatusItem('Supabase', 'Found', false);
      
      // ---> NEW: Attempt to find user JWT from cookies early
      const jwtFromCookies = findUserJwtInCookies();
      if (jwtFromCookies) {
        window._currentUserJwt = jwtFromCookies;
        console.log("[Startup] User JWT found in cookies and stored globally.");
      }
      // <--- END NEW
      
      // Start monitoring network requests and discover tables
      const discoveredTables = monitorNetworkRequests(supabaseUrl);
      
      // Verify tables and check RLS
      const { rlsConfigured, existingTables } = await verifyTablesAndCheckRLS(supabaseUrl, supabaseKey, discoveredTables);
      addStatusItem('Row Level Security', 
                     rlsConfigured ? 'Potentially Configured (Anon Limited)' : '⚠️ Not Configured (Anon Access Detected)', 
                     rlsConfigured);

      // ---> NEW: After checks, if we have JWT from cookies & discovered tables, ensure fetches happened
      if (window._currentUserJwt && window._discoveredTableNames.size > 0) {
         console.log("[Startup] Re-checking discovered tables against cookie JWT...");
         window._discoveredTableNames.forEach(tableName => {
            // Check if auth data already exists for this table to avoid duplicate fetches
            if (!document.getElementById(`json-container-auth-data-${tableName}`)) {
                console.log(`[Startup] Triggering auth fetch for discovered table '${tableName}' using cookie JWT.`);
                fetchAndDisplayAuthData(supabaseUrl, tableName, window._currentUserJwt, supabaseKey);
            }
         });
      }
      // <--- END NEW

    } else {
      addStatusItem('Supabase', 'Not Found', true);
    }
  }

  runChecks();

  // ---> NEW: Helper to format values for display
  function formatValueForDisplay(value) {
      if (value === null) return 'null';
      if (typeof value === 'string' && value.length > 50) return value.substring(0, 50) + '...';
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
  }
  // <--- END NEW

  // ---> NEW: Helper function to generate modified test values
  function getModifiedValue(originalValue) {
    if (typeof originalValue === 'string') {
        // Append _test, or remove if already present
        return originalValue.endsWith('_test') ? originalValue.slice(0, -5) : originalValue + '_test';
    } else if (typeof originalValue === 'number') {
        return originalValue + 1;
    } else if (typeof originalValue === 'boolean') {
        return !originalValue;
    } else {
        // For objects/arrays or other types, attempt to stringify and modify
        try {
            const str = JSON.stringify(originalValue);
            return JSON.parse(str + ' "test": true }'); // Poor man's modification
        } catch (e) {
            return originalValue; // Return original if modification fails
        }
    }
  }
  // <--- END NEW

  // ---> NEW: Handler for the Test Update button click
  async function handleTestUpdateClick(event) {
    const button = event.target;
    const { baseUrl, tableName, primaryKeyColumn, primaryKeyValue, columnName, originalValue: originalValueStr } = button.dataset;
    const statusEl = document.getElementById(`test-status-${tableName}-${columnName}-${primaryKeyValue}`);

    if (!statusEl || !window._currentUserJwt || !window._supabaseAnonKey) {
        console.error("[Test Update] Missing context for update test:", button.dataset);
        if (statusEl) statusEl.textContent = 'Error: Missing context';
        return;
    }

    let originalValue;
    try {
      originalValue = JSON.parse(originalValueStr);
    } catch (e) {
      console.error("[Test Update] Failed to parse original value:", originalValueStr, e);
      statusEl.textContent = 'Error: Bad original value';
      return;
    }

    const modifiedValue = getModifiedValue(originalValue);
    const patchUrl = `${baseUrl}/rest/v1/${tableName}?${primaryKeyColumn}=eq.${primaryKeyValue}`;
    const apiKey = window._supabaseAnonKey;
    const userToken = window._currentUserJwt;

    console.log(`[Test Update] Testing PATCH for ${tableName}.${columnName} (ID: ${primaryKeyValue})`);
    statusEl.textContent = 'Testing...';
    statusEl.style.color = '#6b7280';
    button.disabled = true;

    let updateSuccess = false;
    let errorMessage = '';

    // --- First PATCH: Attempt to update with modified value ---
    try {
      const patchBody = { [columnName]: modifiedValue };
      console.log("[Test Update] PATCH 1 Body:", patchBody);

      const response = await fetch(patchUrl, {
        method: 'PATCH',
        headers: {
          'apikey': apiKey,
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal' // We don't need the data back
        },
        body: JSON.stringify(patchBody)
      });

      if (response.ok && response.status === 204) { // 204 No Content is success for PATCH
        console.log(`✅ [Test Update] PATCH 1 successful for ${tableName}.${columnName}. Column is updatable.`);
        updateSuccess = true;
      } else {
        console.error(`❌ [Test Update] PATCH 1 failed for ${tableName}.${columnName} (Status: ${response.status})`);
        errorMessage = `Status ${response.status}`;
        try {
           const errJson = await response.json();
           errorMessage += `: ${errJson.message || 'Unknown error'}`;
        } catch(e) { /* ignore */ }
      }
    } catch (error) {
      console.error(`❌ [Test Update] Network error during PATCH 1 for ${tableName}.${columnName}:`, error);
      errorMessage = 'Network Error';
      updateSuccess = false;
    }

    // --- Second PATCH: Revert to original value (always attempt) ---
    try {
      const revertBody = { [columnName]: originalValue };
      console.log("[Test Update] PATCH 2 (Revert) Body:", revertBody);

      const revertResponse = await fetch(patchUrl, {
        method: 'PATCH',
        headers: {
          'apikey': apiKey,
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(revertBody)
      });

      if (!revertResponse.ok) {
        console.error(`⚠️ [Test Update] PATCH 2 (Revert) failed for ${tableName}.${columnName} (Status: ${revertResponse.status})! Manual check needed.`);
        // Optionally update UI to indicate revert failure
        errorMessage += ' (Revert Failed!)'; 
      } else {
        console.log(`[Test Update] PATCH 2 (Revert) successful for ${tableName}.${columnName}.`);
      }
    } catch (error) {
      console.error(`⚠️ [Test Update] Network error during PATCH 2 (Revert) for ${tableName}.${columnName}:`, error);
      errorMessage += ' (Revert Network Error!)';
    }

    // --- Update UI ---
    if (updateSuccess) {
      statusEl.textContent = '✅ Updatable';
      statusEl.style.color = '#15803d'; // Dark green
    } else {
      statusEl.textContent = `❌ Not Updatable (${errorMessage})`;
      statusEl.style.color = '#b91c1c'; // Dark red
    }
    button.disabled = false;
  }
  // <--- END NEW
})(); 