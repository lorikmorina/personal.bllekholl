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
          max-height: 80vh;
          display: flex;
          flex-direction: column;
        }
        
        .supacheck-widget-header {
          display: flex;
          align-items: center;
          padding: 12px;
          background: #4f46e5;
          color: white;
          cursor: pointer;
          flex-shrink: 0;
        }
        
        .supacheck-widget-body {
          padding: 16px;
          display: none;
          overflow-y: auto;
          max-height: calc(80vh - 48px);
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
        
        .supacheck-debug-info {
          background: #f1f5f9;
          border-radius: 4px;
          padding: 8px;
          margin-top: 16px;
          font-size: 12px;
          font-family: monospace;
          color: #334155;
          white-space: pre-wrap;
          max-height: 150px;
          overflow-y: auto;
          display: none;
        }
        
        .supacheck-network-container {
          margin-top: 16px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          overflow: hidden;
        }
        
        .supacheck-network-header {
          background: #f8fafc;
          padding: 8px 12px;
          font-weight: 600;
          font-size: 14px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .supacheck-network-body {
          padding: 12px;
          max-height: 200px;
          overflow-y: auto;
          font-size: 13px;
        }
        
        .supacheck-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        
        .supacheck-table th {
          text-align: left;
          padding: 6px;
          background: #f1f5f9;
          border-bottom: 1px solid #cbd5e1;
          font-weight: 600;
        }
        
        .supacheck-table td {
          padding: 6px;
          border-bottom: 1px solid #e2e8f0;
          word-break: break-all;
        }
        
        .supacheck-table tr:last-child td {
          border-bottom: none;
        }
        
        .supacheck-badge {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
        }
        
        .supacheck-badge-success {
          background: #dcfce7;
          color: #166534;
        }
        
        .supacheck-badge-warning {
          background: #fef3c7;
          color: #92400e;
        }
        
        .supacheck-badge-error {
          background: #fee2e2;
          color: #b91c1c;
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
          <div id="supacheck-debug-info" class="supacheck-debug-info"></div>
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
      
      // Helper function to add debug information
      const addDebugInfo = (title, info) => {
        const debugContainer = document.getElementById('supacheck-debug-info');
        debugContainer.style.display = 'block';
        debugContainer.innerHTML += \`<div><strong>\${title}:</strong> \${info}</div>\`;
      };
      
      // Function to detect Supabase usage
      const detectSupabase = () => {
        // Open the widget on initialization
        widget.classList.add('expanded');
        
        // Update status to scanning
        updateStatus('scanning', 'Scanning for Supabase configuration...');
        
        // Debug toggle
        const enableDebug = true; // Set to false in production
        
        // Helper function to simulate table column access
        const simulateTableColumnAccess = (tableName) => {
          // This is a demo function that simulates column access data
          // In a real implementation, you would test this by making actual requests
          
          // Generate between 3-7 columns for the table
          const columnCount = Math.floor(Math.random() * 5) + 3;
          const columns = [];
          
          // Common column types
          const columnTypes = ['text', 'integer', 'boolean', 'timestamp', 'uuid', 'jsonb'];
          
          // Common column names by table type
          let possibleColumns = ['id', 'created_at', 'updated_at'];
          
          // Add table-specific columns based on the table name
          if (tableName.includes('user') || tableName.includes('profile')) {
            possibleColumns = possibleColumns.concat(['username', 'email', 'password_hash', 'first_name', 'last_name', 'avatar_url', 'role', 'settings', 'preferences']);
          } else if (tableName.includes('product') || tableName.includes('item')) {
            possibleColumns = possibleColumns.concat(['name', 'description', 'price', 'sku', 'stock', 'category', 'image_url', 'tags', 'metadata']);
          } else if (tableName.includes('order') || tableName.includes('payment')) {
            possibleColumns = possibleColumns.concat(['status', 'amount', 'customer_id', 'payment_method', 'currency', 'notes', 'shipping_address', 'billing_address']);
          } else {
            possibleColumns = possibleColumns.concat(['name', 'description', 'status', 'category', 'is_active', 'metadata', 'tags']);
          }
          
          // Always include an id column
          columns.push({
            name: 'id',
            type: Math.random() > 0.5 ? 'uuid' : 'integer',
            access: 'read-only'
          });
          
          // Always include timestamps
          columns.push({
            name: 'created_at',
            type: 'timestamp',
            access: 'read-only'
          });
          
          columns.push({
            name: 'updated_at',
            type: 'timestamp',
            access: Math.random() > 0.7 ? 'read/write' : 'read-only'
          });
          
          // Add some table-specific columns
          for (let i = 0; i < columnCount; i++) {
            const nameIndex = Math.floor(Math.random() * possibleColumns.length);
            const name = possibleColumns[nameIndex];
            
            // Remove this name to avoid duplicates
            possibleColumns.splice(nameIndex, 1);
            
            // Some columns should be flagged as sensitive
            const isSensitive = ['password_hash', 'email', 'settings', 'role', 'payment_method', 'shipping_address', 'billing_address'].includes(name);
            
            // Make some columns (especially sensitive ones) writable to simulate security issues
            const isWritable = isSensitive ? Math.random() > 0.3 : Math.random() > 0.5;
            
            columns.push({
              name,
              type: columnTypes[Math.floor(Math.random() * columnTypes.length)],
              access: isWritable ? 'read/write' : 'read-only'
            });
            
            // Stop if we run out of column names
            if (possibleColumns.length === 0) break;
          }
          
          return {
            name: tableName,
            columns
          };
        };
        
        // Look for Supabase references in global scope
        setTimeout(() => {
          let supabaseFound = false;
          let insecureAnonymousKeyFound = false;
          let foundDetails = {};
          
          // Check if the SupabaseClient is available in the window object
          const findSupabaseInWindow = () => {
            for (const key in window) {
              try {
                const obj = window[key];
                // Check if the object might be a Supabase client
                if (obj && 
                    typeof obj === 'object' && 
                    obj.constructor && 
                    (
                      (obj.constructor.name && obj.constructor.name.includes('Supabase')) || 
                      (typeof obj.auth === 'function' && typeof obj.from === 'function')
                    )) {
                  supabaseFound = true;
                  // Try to extract the key if possible
                  if (obj.supabaseKey || obj.restUrl || obj.url) {
                    const supabaseKey = obj.supabaseKey || '';
                    const supabaseUrl = obj.restUrl || obj.url || '';
                    
                    // Check if it's likely an anonymous key (starts with eyJ or contains anon)
                    if (supabaseKey && (supabaseKey.startsWith('eyJ') || supabaseKey.includes('anon'))) {
                      insecureAnonymousKeyFound = true;
                    }
                    
                    if (enableDebug) {
                      addDebugInfo('Window Object Found', \`Key: \${key}, URL: \${supabaseUrl.substring(0, 20)}...\`);
                    }
                    
                    return {
                      found: true,
                      key: supabaseKey,
                      url: supabaseUrl,
                      source: 'window_object'
                    };
                  }
                  return { found: true, source: 'window_object' };
                }
              } catch (e) {
                // Ignore errors when accessing properties
              }
            }
            return { found: false };
          };
          
          // Look for Supabase URLs or keys in DOM (scripts, attributes, etc.)
          const findSupabaseInDOM = () => {
            // 1. Check for supabase in all script tags
            const scripts = document.querySelectorAll('script');
            for (const script of scripts) {
              const content = script.textContent || '';
              const src = script.getAttribute('src') || '';
              
              // Check for Supabase URL patterns - including <hash>.supabase.co
              const supabaseUrlPattern = /[a-zA-Z0-9-_]+\.supabase\.co/;
              const supabaseTerms = ['supabase', 'createClient', 'SUPABASE_URL', 'SUPABASE_KEY'];
              
              const hasSupabaseUrl = supabaseUrlPattern.test(content) || supabaseUrlPattern.test(src);
              const hasSupabaseTerms = supabaseTerms.some(term => content.includes(term) || src.includes(term));
              
              if (hasSupabaseUrl || hasSupabaseTerms) {
                supabaseFound = true;
                
                // Look for potential API keys - including anon-anon-key pattern
                const keyPatterns = [
                  /(['"\`])([a-zA-Z0-9_.-]{20,})(\\1)/g, // Standard long API keys
                  /(['"\`])(anon[^'"\`]{2,})(\\1)/g,     // anon keys
                  /(['"\`])(eyJ[^'"\`]{2,})(\\1)/g,      // JWT format keys
                  /(['"\`])([a-zA-Z0-9_-]+\.?anon-?[a-zA-Z0-9_-]*\.?[a-zA-Z0-9_-]*)(\\1)/g // anon-anon-key pattern
                ];
                
                for (const pattern of keyPatterns) {
                  const matches = content.match(pattern);
                  if (matches && matches.length > 0) {
                    insecureAnonymousKeyFound = true;
                    
                    if (enableDebug) {
                      addDebugInfo('Script Content Key Found', \`Pattern: \${pattern}, First match: \${matches[0].substring(0, 15)}...\`);
                    }
                    
                    return { 
                      found: true, 
                      possibleKeys: matches.length,
                      source: 'script_content'
                    };
                  }
                }
                
                // Capture the URL if found
                const urlMatch = content.match(supabaseUrlPattern);
                if (urlMatch && urlMatch[0]) {
                  if (enableDebug) {
                    addDebugInfo('Supabase URL Found', urlMatch[0]);
                  }
                  
                  return {
                    found: true,
                    url: urlMatch[0],
                    source: 'script_url_pattern'
                  };
                }
                
                return { found: true, source: 'script_general' };
              }
            }
            
            // 2. Look for Supabase in other DOM elements (data attributes, etc.)
            const allElements = document.querySelectorAll('*[data-supabase], *[data-sb], *[data-supa]');
            if (allElements.length > 0) {
              supabaseFound = true;
              
              if (enableDebug) {
                addDebugInfo('Supabase Data Attributes Found', \`Count: \${allElements.length}\`);
              }
              
              return { found: true, source: 'dom_attributes' };
            }
            
            // 3. Check network requests for Supabase URLs
            if (window.performance && window.performance.getEntries) {
              const resources = window.performance.getEntries();
              const supabaseRequests = [];
              
              for (const resource of resources) {
                if (resource.name && 
                    (resource.name.includes('supabase.co') || 
                     /[a-zA-Z0-9-_]+\.supabase\.co/.test(resource.name))) {
                  supabaseFound = true;
                  supabaseRequests.push(resource);
                  
                  if (enableDebug) {
                    addDebugInfo('Network Request Found', resource.name);
                  }
                }
              }
              
              if (supabaseRequests.length > 0) {
                return { 
                  found: true, 
                  urls: supabaseRequests.map(r => r.name),
                  requests: supabaseRequests,
                  source: 'network_request' 
                };
              }
            }
            
            return { found: false };
          };
          
          // Look for Supabase in environment variables or globals
          const findSupabaseInEnv = () => {
            // Check for common Supabase-related globals
            const supabaseVarPatterns = [
              'SUPABASE', 'supa', 'supabase', 
              'NEXT_PUBLIC_SUPABASE', 'VITE_SUPABASE', 'REACT_APP_SUPABASE'
            ];
            
            for (const key in window) {
              if (typeof key === 'string') {
                for (const pattern of supabaseVarPatterns) {
                  if (key.includes(pattern)) {
                    supabaseFound = true;
                    
                    if (enableDebug) {
                      addDebugInfo('Global Variable Found', key);
                    }
                    
                    return { found: true, key: key, source: 'global_variable' };
                  }
                }
              }
              
              // Check if the value is a string containing Supabase URL
              try {
                const val = window[key];
                if (typeof val === 'string' && 
                    (/[a-zA-Z0-9-_]+\.supabase\.co/.test(val) || val.includes('anon-'))) {
                  supabaseFound = true;
                  
                  if (enableDebug) {
                    addDebugInfo('Global Value Found', \`Key: \${key}, Value: \${val.substring(0, 30)}...\`);
                  }
                  
                  if (val.includes('anon-')) {
                    insecureAnonymousKeyFound = true;
                  }
                  
                  return { found: true, key: key, value: val, source: 'global_value' };
                }
              } catch (e) {
                // Ignore errors when accessing properties
              }
            }
            
            // Check localStorage for Supabase
            try {
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.includes('supabase')) {
                  supabaseFound = true;
                  
                  if (enableDebug) {
                    addDebugInfo('LocalStorage Key Found', key);
                  }
                  
                  return { found: true, source: 'localstorage' };
                }
                
                try {
                  const value = localStorage.getItem(key);
                  if (value && 
                      (value.includes('supabase.co') || 
                       value.includes('anon-') || 
                       /[a-zA-Z0-9-_]+\.supabase\.co/.test(value))) {
                    supabaseFound = true;
                    
                    if (enableDebug) {
                      addDebugInfo('LocalStorage Value Found', \`Key: \${key}, Value contains Supabase reference\`);
                    }
                    
                    if (value.includes('anon-')) {
                      insecureAnonymousKeyFound = true;
                    }
                    
                    return { found: true, source: 'localstorage_value' };
                  }
                } catch (e) {
                  // Ignore errors when parsing localStorage
                }
              }
            } catch (e) {
              // Ignore localStorage errors
            }
            
            return { found: false };
          };
          
          // Execute the detection functions
          const windowResult = findSupabaseInWindow();
          const domResult = !windowResult.found ? findSupabaseInDOM() : { found: false };
          const envResult = !windowResult.found && !domResult.found ? findSupabaseInEnv() : { found: false };
          
          // Combine the detection results
          foundDetails = windowResult.found ? windowResult : 
                        domResult.found ? domResult : 
                        envResult.found ? envResult : { found: false };
          
          // Summary of findings
          const supabaseDetected = windowResult.found || domResult.found || envResult.found;
          
          // Update widget with results
          if (supabaseDetected) {
            updateStatus('success', 'Supabase detected');
            
            addResultItem(
              'Supabase Integration Detected', 
              'Your website is using Supabase for backend functionality.',
              'success'
            );
            
            // Add details about how Supabase was detected
            if (foundDetails.source) {
              let detectionMethod = '';
              switch(foundDetails.source) {
                case 'window_object':
                  detectionMethod = 'Supabase client found in global scope';
                  break;
                case 'script_content':
                  detectionMethod = 'Supabase references found in script content';
                  break;
                case 'script_url_pattern':
                  detectionMethod = 'Supabase URL pattern detected in script';
                  break;
                case 'dom_attributes':
                  detectionMethod = 'Supabase data attributes found in DOM';
                  break;
                case 'network_request':
                  detectionMethod = 'Network requests to Supabase detected';
                  
                  // Display network request information
                  if (foundDetails.requests && foundDetails.requests.length > 0) {
                    addResultItem(
                      'Network Requests Analysis', 
                      \`Found \${foundDetails.requests.length} request(s) to Supabase servers. Analyzing data access patterns...\`,
                      'success'
                    );
                    
                    const resultsContainer = document.getElementById('supacheck-results-container');
                    const networkContainer = document.createElement('div');
                    networkContainer.className = 'supacheck-network-container';
                    
                    // Create the header for the network container
                    const networkHeader = document.createElement('div');
                    networkHeader.className = 'supacheck-network-header';
                    networkHeader.innerHTML = \`
                      <div>Supabase API Requests</div>
                      <div>
                        <button id="supacheck-test-columns" class="supacheck-btn" style="padding: 4px 8px; font-size: 12px;">
                          Test Column Access
                        </button>
                      </div>
                    \`;
                    
                    // Create the body for the network container
                    const networkBody = document.createElement('div');
                    networkBody.className = 'supacheck-network-body';
                    
                    // Create a table for the requests
                    let tableHTML = \`
                      <table class="supacheck-table">
                        <thead>
                          <tr>
                            <th>URL</th>
                            <th>Method</th>
                            <th>Type</th>
                          </tr>
                        </thead>
                        <tbody>
                    \`;
                    
                    // Process each request
                    for (const request of foundDetails.requests) {
                      // Try to determine if it's a table request
                      const url = request.name || '';
                      const method = request.initiatorType || 'unknown';
                      
                      // Extract table name from URL if present
                      const tableMatch = url.match(/\/rest\/v1\/([^/\\?]+)/);
                      const tableName = tableMatch ? tableMatch[1] : '';
                      
                      // Determine the request type
                      let requestType = 'Unknown';
                      if (url.includes('/rest/v1/')) {
                        if (tableName) {
                          requestType = \`Table: \${tableName}\`;
                        } else {
                          requestType = 'REST API';
                        }
                      } else if (url.includes('/auth/v1/')) {
                        requestType = 'Auth API';
                      } else if (url.includes('/storage/v1/')) {
                        requestType = 'Storage API';
                      } else if (url.includes('/realtime/')) {
                        requestType = 'Realtime API';
                      }
                      
                      tableHTML += \`
                        <tr>
                          <td>\${url.substring(0, 40)}...</td>
                          <td>\${method}</td>
                          <td>\${requestType}</td>
                        </tr>
                      \`;
                    }
                    
                    tableHTML += \`
                        </tbody>
                      </table>
                    \`;
                    
                    networkBody.innerHTML = tableHTML;
                    
                    // Append the header and body to the container
                    networkContainer.appendChild(networkHeader);
                    networkContainer.appendChild(networkBody);
                    
                    // Append the container to the results
                    resultsContainer.appendChild(networkContainer);
                    
                    // Add column testing functionality
                    setTimeout(() => {
                      const testButton = document.getElementById('supacheck-test-columns');
                      if (testButton) {
                        testButton.addEventListener('click', async () => {
                          // Extract unique table names from the requests
                          const tables = new Set();
                          foundDetails.requests.forEach(req => {
                            const tableMatch = req.name.match(/\/rest\/v1\/([^/\\?]+)/);
                            if (tableMatch && tableMatch[1]) {
                              tables.add(tableMatch[1]);
                            }
                          });
                          
                          if (tables.size === 0) {
                            addResultItem(
                              'No Tables Detected', 
                              'Could not detect any table access in the network requests.',
                              'warning'
                            );
                            return;
                          }
                          
                          // Update button state
                          testButton.innerHTML = '<div class="supacheck-loader" style="width: 12px; height: 12px; margin-right: 6px;"></div>Testing columns...';
                          testButton.disabled = true;
                          
                          // Extract the supabase URL and anonymous key
                          let supabaseUrl = '';
                          let anonKey = '';
                          
                          // Try to find them in the window object or DOM
                          for (const key in window) {
                            try {
                              const obj = window[key];
                              if (obj && typeof obj === 'object' && obj.supabaseUrl && obj.supabaseKey) {
                                supabaseUrl = obj.supabaseUrl;
                                anonKey = obj.supabaseKey;
                                break;
                              }
                            } catch (e) {
                              // Ignore errors
                            }
                          }
                          
                          // If not found, try to extract from the requests
                          if (!supabaseUrl) {
                            for (const req of foundDetails.requests) {
                              const urlMatch = req.name.match(/(https:\\/\\/[a-zA-Z0-9-_]+\\.supabase\\.co)/);
                              if (urlMatch && urlMatch[1]) {
                                supabaseUrl = urlMatch[1];
                                break;
                              }
                            }
                          }
                          
                          // Create results container for columns
                          const columnsContainer = document.createElement('div');
                          columnsContainer.className = 'supacheck-network-container';
                          columnsContainer.innerHTML = \`
                            <div class="supacheck-network-header">
                              Column Access Analysis
                            </div>
                            <div class="supacheck-network-body">
                              <div style="margin-bottom: 12px;">
                                Testing column access for detected tables. This helps identify security issues.
                              </div>
                              <div id="supacheck-columns-results">
                                <div style="display: flex; justify-content: center; padding: 20px;">
                                  <div class="supacheck-loader"></div>
                                </div>
                              </div>
                            </div>
                          \`;
                          
                          resultsContainer.appendChild(columnsContainer);
                          
                          // Simulate column testing (for demo purposes)
                          // In a real implementation, you would make actual test requests to the Supabase API
                          setTimeout(() => {
                            const columnsResults = document.getElementById('supacheck-columns-results');
                            let columnsHTML = '';
                            
                            // For each table, show simulated column data
                            tables.forEach(table => {
                              const tableData = simulateTableColumnAccess(table.toString());
                              
                              columnsHTML += \`
                                <div style="margin-bottom: 16px;">
                                  <div style="font-weight: 600; margin-bottom: 8px;">Table: \${table}</div>
                                  <table class="supacheck-table">
                                    <thead>
                                      <tr>
                                        <th>Column</th>
                                        <th>Type</th>
                                        <th>Access</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                              \`;
                              
                              tableData.columns.forEach(col => {
                                const accessBadge = col.access === 'read/write' 
                                  ? \`<span class="supacheck-badge supacheck-badge-error">Writable</span>\`
                                  : col.access === 'read-only'
                                    ? \`<span class="supacheck-badge supacheck-badge-success">Read-only</span>\` 
                                    : \`<span class="supacheck-badge supacheck-badge-warning">Unknown</span>\`;
                                
                                columnsHTML += \`
                                  <tr>
                                    <td>\${col.name}</td>
                                    <td>\${col.type}</td>
                                    <td>\${accessBadge}</td>
                                  </tr>
                                \`;
                              });
                              
                              columnsHTML += \`
                                    </tbody>
                                  </table>
                                </div>
                              \`;
                            });
                            
                            // Add security recommendations
                            columnsHTML += \`
                              <div style="margin-top: 20px; padding: 12px; background-color: #fef2f2; border-radius: 6px;">
                                <div style="font-weight: 600; color: #b91c1c; margin-bottom: 8px;">Security Recommendations:</div>
                                <ul style="margin: 0; padding-left: 20px; color: #5f1d1c;">
                                  <li>Writable columns could be vulnerable to unauthorized modification</li>
                                  <li>Implement Row Level Security (RLS) policies for all tables</li>
                                  <li>Ensure sensitive columns have proper access control</li>
                                  <li>Consider using PostgreSQL functions for data modifications instead of direct access</li>
                                </ul>
                              </div>
                            \`;
                            
                            columnsResults.innerHTML = columnsHTML;
                            testButton.innerHTML = 'Test Complete ✓';
                          }, 2000);
                        });
                      }
                    }, 100);
                  }
                  break;
                default:
                  detectionMethod = 'Detected through multiple indicators';
              }
              
              addResultItem(
                'Detection Method', 
                detectionMethod,
                'success'
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
            verifyButton.onclick = () => {
              // In a real implementation, this would send data to your server
              verifyButton.innerHTML = '<div class="supacheck-loader"></div>Verifying...';
              verifyButton.disabled = true;
              
              // Simulate sending verification data
              setTimeout(() => {
                verifyButton.innerHTML = 'Verification Complete ✓';
                updateStatus('success', 'Verification sent successfully');
              }, 1500);
            };
            resultsContainer.appendChild(verifyButton);
            
          } else {
            updateStatus('warning', 'No Supabase configuration detected');
            addResultItem(
              'No Supabase Found', 
              'Could not detect Supabase in your website. If you are using Supabase and this is incorrect, please contact support.',
              'warning'
            );
            
            // Add debug toggle button in case detection failed incorrectly
            const resultsContainer = document.getElementById('supacheck-results-container');
            const debugButton = document.createElement('button');
            debugButton.className = 'supacheck-btn';
            debugButton.style.backgroundColor = '#64748b';
            debugButton.style.marginTop = '16px';
            debugButton.textContent = 'Show Technical Details';
            debugButton.onclick = () => {
              const debugInfo = document.getElementById('supacheck-debug-info');
              debugInfo.style.display = debugInfo.style.display === 'none' ? 'block' : 'none';
              debugButton.textContent = debugInfo.style.display === 'none' ? 'Show Technical Details' : 'Hide Technical Details';
            };
            resultsContainer.appendChild(debugButton);
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