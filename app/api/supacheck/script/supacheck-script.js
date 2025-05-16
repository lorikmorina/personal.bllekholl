// Supabase Security Check Tool
// VERSION: Will be replaced dynamically
(function() {
  // Global flag to track if the script has already initialized
  let hasInitialized = false;

  // Add detailed console logging for debugging
  function logDebug(message, data) {
    console.log(`[Supacheck Debug] ${message}`, data || '');
  }

  function logError(message, error) {
    console.error(`[Supacheck Error] ${message}`, error || '');
  }

  // Add keyframes for button animations
  function addKeyframeAnimations() {
    if (!document.getElementById('supacheck-button-keyframes')) {
      const buttonStyle = document.createElement('style');
      buttonStyle.id = 'supacheck-button-keyframes';
      buttonStyle.textContent = `
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
        @keyframes slideDown { from { max-height: 0; opacity: 0; } to { max-height: 80vh; opacity: 1; } }
        @keyframes slideUp { from { max-height: 80vh; opacity: 1; } to { max-height: 0; opacity: 0; } }
      `;
      document.head.appendChild(buttonStyle);
    }
  }

  // Utility function to search for Supabase credentials in script content
  function checkScriptContent(content) {
    try {
      let foundUrl = null;
      let foundKey = null;
      
      // Search for Supabase URLs using regex patterns
      const urlPattern = /(https?:\/\/[a-zA-Z0-9-]+\.supabase\.co)/gi;
      const urlMatches = content.match(urlPattern) || [];
      
      // Log any URL matches for debugging
      if (urlMatches.length > 0) {
        logDebug(`Found Supabase URL candidates: ${urlMatches.length}`);
      }
      
      // More flexible pattern that looks for any JWT pattern regardless of variable name
      // Looks for strings that match the JWT format (three parts separated by dots)
      const keyPattern = /(['"])?(eyJ[a-zA-Z0-9._-]+)\.[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]*['"]?/gi;
      
      let keyMatch;
      while ((keyMatch = keyPattern.exec(content)) !== null) {
        // The actual key starts with the JWT header part
        if (keyMatch[2]) {
          // Extract the full JWT by matching from the start position
          const fullKeyMatch = content.substring(keyMatch.index).match(/['"]?(eyJ[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]*)/);
          if (fullKeyMatch && fullKeyMatch[1]) {
            const potentialKey = fullKeyMatch[1];
            // Basic check to verify it's a proper JWT (three parts)
            if (potentialKey.split('.').length === 3) {
              foundKey = potentialKey;
              logDebug(`Found potential Supabase key: ${potentialKey.substring(0, 10)}...`);
              if (foundUrl) {
                return { url: foundUrl, key: foundKey };
              }
              break; // Found a key, stop looking for more keys for now
            }
          }
        }
      }

      // If we found a URL but not a key yet, search near the URL again with a simpler pattern
      if (urlMatches.length > 0 && !foundKey) {
        foundUrl = urlMatches[0];
        logDebug(`Using Supabase URL: ${foundUrl}`);
        
        // Look for JWT keys potentially near the URL (broader search)
        const nearbyKeyPattern = /(eyJ[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]*)/g; // Simpler JWT search
        const nearbyKeyMatches = content.match(nearbyKeyPattern) || [];
        
        if (nearbyKeyMatches.length > 0) {
          logDebug(`Found ${nearbyKeyMatches.length} potential key matches near the URL`);
          // Find the key closest to the URL? For now, just take the first valid one.
          foundKey = nearbyKeyMatches.find(key => key.split('.').length === 3); // Ensure it looks like JWT
          if (foundKey) {
            logDebug(`Selected key: ${foundKey.substring(0, 10)}...`);
          }
        }
      }

      // Also look for variable names like supabaseKey, SUPABASE_KEY, etc.
      if (urlMatches.length > 0 && !foundKey) {
        const variableNamePatterns = [
          /['"]?(supabaseKey|supabaseAnonKey|SUPABASE_KEY|SUPABASE_ANON_KEY|apiKey|API_KEY|anonKey|ANON_KEY)['"]?\s*[:=]\s*['"]([^'"]+)['"]/i,
          /['"]?(supabase\.?key|supabase\.?anon\.?key)['"]?\s*[:=]\s*['"]([^'"]+)['"]/i
        ];
        
        for (const pattern of variableNamePatterns) {
          const matches = [...content.matchAll(pattern)];
          if (matches.length > 0) {
            logDebug(`Found potential key via variable name pattern: ${matches[0][1]}`);
            const keyCandidate = matches[0][2];
            if (keyCandidate && keyCandidate.length > 20) { // Basic length check
              foundKey = keyCandidate;
              break;
            }
          }
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
        logDebug(`Returning URL only (no key found): ${urlMatches[0]}`);
        return { url: urlMatches[0], key: null }; // Indicate URL found, but no key
      }

      // Fallback: If only Key was found, but no URL
      if (foundKey && !foundUrl) {
        // Attempt to guess the URL from the key (based on common patterns)
        const projectRef = tryExtractProjectRefFromKey(foundKey);
        if (projectRef) {
          const guessedUrl = `https://${projectRef}.supabase.co`;
          logDebug(`Guessed URL from key: ${guessedUrl}`);
          return { url: guessedUrl, key: foundKey };
        }
        
        // If couldn't guess URL, return null
        logDebug(`Found key but no URL, couldn't proceed`);
        return null;
      }
      
      return null; // No credentials found
    } catch (error) {
      logError("Error in checkScriptContent:", error);
      return null;
    }
  }

  // New: Try to extract project reference from key
  function tryExtractProjectRefFromKey(key) {
    try {
      // JWT tokens consist of 3 parts: header.payload.signature
      const parts = key.split('.');
      if (parts.length !== 3) return null;
      
      // Decode the payload
      const payload = JSON.parse(atob(parts[1]));
      
      // Check for common fields that might contain project reference
      if (payload.iss && payload.iss.includes('supabase')) {
        const issuerParts = payload.iss.split('/');
        if (issuerParts.length > 0) {
          // Try to extract project ref from issuer
          const potentialRef = issuerParts[issuerParts.length - 1];
          if (potentialRef && potentialRef.length > 5) {
            return potentialRef;
          }
        }
      }
      
      return null;
    } catch (e) {
      // If any error occurs during parsing, return null
      return null;
    }
  }

  // Check for Supabase in localStorage
  function checkLocalStorage() {
    try {
      logDebug("Checking localStorage for Supabase data");
      let foundUrl = null;
      let foundKey = null;
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        
        // Skip empty values
        if (!value) continue;
        
        // Check if key name suggests Supabase
        const isSupabaseKey = key.toLowerCase().includes('supabase') || 
                            key.toLowerCase().includes('anon') || 
                            key.toLowerCase().includes('api');
        
        if (isSupabaseKey) {
          logDebug(`Found potential Supabase item in localStorage: ${key}`);
          try {
            // First check if the value itself contains a URL
            const urlMatch = value.match(/(https?:\/\/[a-zA-Z0-9-]+\.supabase\.co)/i);
            if (urlMatch) {
              foundUrl = urlMatch[1];
              logDebug(`Found Supabase URL in localStorage value: ${foundUrl}`);
            }
            
            // Then check for JWT format
            const keyMatch = value.match(/(eyJ[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]*)/);
            if (keyMatch) {
              foundKey = keyMatch[1];
              logDebug(`Found potential API key in localStorage value: ${foundKey.substring(0, 10)}...`);
            }
            
            // Try parsing as JSON if no direct matches
            if (!foundUrl || !foundKey) {
              try {
                const parsed = JSON.parse(value);
                
                // Check parsed object for URL and key
                const jsonStr = JSON.stringify(parsed);
                
                if (!foundUrl) {
                  const urlMatch = jsonStr.match(/(https?:\/\/[a-zA-Z0-9-]+\.supabase\.co)/i);
                  if (urlMatch) {
                    foundUrl = urlMatch[1];
                    logDebug(`Found Supabase URL in parsed localStorage JSON: ${foundUrl}`);
                  }
                }
                
                if (!foundKey) {
                  const keyMatch = jsonStr.match(/(eyJ[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]*)/);
                  if (keyMatch) {
                    foundKey = keyMatch[1];
                    logDebug(`Found potential API key in parsed localStorage JSON: ${foundKey.substring(0, 10)}...`);
                  }
                }
              } catch (e) {
                // Not valid JSON, continue
              }
            }
          } catch (e) {
            logError("Error processing localStorage item:", e);
          }
        }
        
        // If we found both URL and key, stop searching
        if (foundUrl && foundKey) break;
      }
      
      // Return results
      if (foundUrl || foundKey) {
        return { url: foundUrl, key: foundKey };
      }
    } catch (e) {
      logError("Error accessing localStorage:", e);
    }
    
    return null;
  }

  // Create a minimal container to display results
  function createWidget() {
    const container = document.createElement('div');
    container.id = 'supabase-check-widget';
    container.style.cssText = `
      position: fixed; bottom: 20px; right: 20px; width: 350px;
      background: #ffffff; border: none; border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1), 0 5px 10px rgba(0, 0, 0, 0.05); 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', sans-serif;
      z-index: 9999; overflow: hidden; transition: all 0.3s cubic-bezier(0.2, 0, 0.2, 1); color: #1a202c;
      max-height: 80vh; display: flex; flex-direction: column;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      padding: 14px 16px; 
      background: linear-gradient(135deg, #2563eb, #4338ca); 
      color: white; 
      font-weight: 600; 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
      cursor: pointer; 
      flex-shrink: 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    `;
    
    // Create logo and text container
    const logoContainer = document.createElement('div');
    logoContainer.style.cssText = 'display: flex; align-items: center; gap: 10px;';
    
    // Add inline SVG logo
    const logoSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    logoSvg.setAttribute('width', '24px');
    logoSvg.setAttribute('height', '24px');
    logoSvg.setAttribute('viewBox', '0 0 1080 1080');
    logoSvg.setAttribute('fill', 'none');
    logoSvg.style.cssText = 'flex-shrink: 0;';
    
    const logoPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    logoPath.setAttribute('d', 'M540 219.345C538.506 219.345 536.995 219.507 535.526 219.731C520.857 222.296 501.367 232.041 471.881 246.809C424.039 270.767 351.704 331.897 294.523 333.366C287.177 333.565 280.179 336.841 275.198 342.469C270.168 348.098 267.573 355.614 267.947 363.26C280.25 612.877 369.749 767.364 526.847 857.145C530.931 859.461 535.467 860.655 540 860.655C544.533 860.655 549.069 859.461 553.153 857.145C710.25 767.364 799.751 612.877 812.053 363.26C812.427 355.614 809.832 348.098 804.802 342.469C799.821 336.816 792.848 333.565 785.477 333.366C728.321 331.872 655.974 270.753 608.158 246.77C578.621 232.002 559.143 222.257 544.474 219.692C542.98 219.493 541.494 219.345 540 219.345ZM574.021 411.823C586.891 411.823 597.358 422.289 597.358 435.159L597.358 644.841C597.357 657.711 586.891 668.177 574.021 668.177C561.151 668.177 550.762 657.711 550.762 644.841L550.762 435.159C550.762 422.289 561.151 411.823 574.021 411.823ZM480.868 458.419C493.738 458.419 504.127 468.846 504.127 481.717L504.127 598.283C504.127 611.154 493.738 621.581 480.868 621.581C467.998 621.581 457.532 611.154 457.532 598.283L457.532 481.717C457.532 468.846 467.998 458.419 480.868 458.419ZM667.251 481.717C680.122 481.717 690.626 492.183 690.626 505.053L690.626 598.283C690.626 611.154 680.122 621.581 667.251 621.581C654.381 621.581 643.992 611.154 643.992 598.283L643.992 505.053C643.992 492.183 654.381 481.717 667.251 481.717ZM387.638 505.053C400.508 505.053 410.897 515.442 410.897 528.312L410.897 574.947C410.897 587.817 400.508 598.283 387.638 598.283C374.768 598.283 364.34 587.817 364.34 574.947L364.34 528.312C364.34 515.442 374.768 505.053 387.638 505.053Z');
    logoPath.setAttribute('fill', 'white');
    
    logoSvg.appendChild(logoPath);
    logoContainer.appendChild(logoSvg);
    
    // Add text
    const headerText = document.createElement('span');
    headerText.textContent = 'SecureVibing Supacheck';
    headerText.style.fontWeight = '600';
    headerText.style.letterSpacing = '0.2px';
    logoContainer.appendChild(headerText);
    
    header.appendChild(logoContainer);
    
    // Add arrow indicator
    const toggleArrow = document.createElement('span');
    toggleArrow.id = 'supacheck-toggle-arrow';
    toggleArrow.textContent = '▼';
    toggleArrow.style.cssText = 'transition: transform 0.3s cubic-bezier(0.2, 0, 0.2, 1); font-size: 12px; opacity: 0.9;';
    
    header.onclick = () => {
      const content = document.getElementById('supabase-check-content');
      const isOpen = content.classList.contains('open');
      const arrow = document.getElementById('supacheck-toggle-arrow');
      
      if (isOpen) {
        // Close animation
        content.style.animation = 'slideUp 0.3s cubic-bezier(0.2, 0, 0.2, 1) forwards';
        arrow.style.transform = 'rotate(0deg)';
        // After animation completes, update class
        setTimeout(() => {
          content.classList.remove('open');
        }, 300);
      } else {
        // Open animation
        content.style.display = 'block';
        content.style.animation = 'slideDown 0.3s cubic-bezier(0.2, 0, 0.2, 1) forwards';
        arrow.style.transform = 'rotate(180deg)';
        content.classList.add('open');
      }
    };

    const closeButton = document.createElement('span');
    closeButton.textContent = '×';
    closeButton.style.cssText = 'cursor: pointer; font-size: 20px; margin-left: 12px; opacity: 0.9; line-height: 1; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;';
    closeButton.onmouseover = () => { closeButton.style.opacity = '1'; };
    closeButton.onmouseout = () => { closeButton.style.opacity = '0.9'; };
    closeButton.onclick = (e) => { 
      e.stopPropagation(); 
      
      // Add fade out animation before removing
      container.style.opacity = '0';
      container.style.transform = 'translateY(10px)';
      
      // Remove after animation
      setTimeout(() => {
        document.body.removeChild(container);
      }, 300);
    };
    
    // Add the arrow and close button
    header.appendChild(toggleArrow);
    header.appendChild(closeButton);
    container.appendChild(header);

    const content = document.createElement('div');
    content.id = 'supabase-check-content';
    content.style.cssText = `
      padding: 16px; 
      overflow-y: auto; 
      flex-grow: 1;
      display: none;
      opacity: 0;
      transform-origin: top;
      transition: opacity 0.3s ease, max-height 0.3s ease;
      background: #f8fafc;
    `;
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
      margin-bottom: 12px; padding: 12px 14px; border-radius: 8px;
      background: ${isOk ? '#F0FDF4' : '#FEF2F2'};
      border-left: 3px solid ${isOk ? '#22C55E' : '#EF4444'};
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    `;

    // Add hover effect
    itemEl.onmouseover = () => {
      itemEl.style.transform = 'translateY(-1px)';
      itemEl.style.boxShadow = '0 3px 6px rgba(0, 0, 0, 0.1)';
    };
    
    itemEl.onmouseout = () => {
      itemEl.style.transform = 'translateY(0)';
      itemEl.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
    };

    const labelEl = document.createElement('div');
    labelEl.textContent = label;
    labelEl.style.fontWeight = '600';
    labelEl.style.fontSize = '14px';
    
    const statusEl = document.createElement('div');
    statusEl.textContent = status;
    statusEl.style.cssText = `
      padding: 3px 10px; border-radius: 12px; font-size: 12px; 
      background: ${isOk ? '#DCFCE7' : '#FEE2E2'}; 
      color: ${isOk ? '#166534' : '#B91C1C'};
      font-weight: 500;
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
      margin-top: 14px;
      padding: 12px 14px;
      background: #EFF6FF;
      border-radius: 8px;
      border-left: 3px solid #2563eb;
      font-size: 13px;
      line-height: 1.5;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
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
    // Create a hidden container for tracking requests
    // This will keep the tracking functionality while hiding the UI
    const dummyContainer = document.createElement('div');
    dummyContainer.id = 'supabase-requests';
    dummyContainer.style.display = 'none'; // Hide it completely
    
    return dummyContainer;
  }

  // Create a section for discovered tables
  function createTablesSection() {
    const sectionEl = document.createElement('div');
    sectionEl.id = 'supabase-tables-section';
    sectionEl.style.cssText = `
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
    `;
    
    const titleEl = document.createElement('div');
    titleEl.textContent = 'Discovered Tables';
    titleEl.style.cssText = `
      font-weight: 600;
      margin-bottom: 12px;
      font-size: 15px;
      color: #334155;
      display: flex;
      align-items: center;
    `;
    
    // Add database icon before title
    const dbIcon = document.createElement('span');
    dbIcon.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 6px;">
        <path d="M12 8C16.4183 8 20 6.65685 20 5C20 3.34315 16.4183 2 12 2C7.58172 2 4 3.34315 4 5C4 6.65685 7.58172 8 12 8Z" fill="#334155"/>
        <path d="M4 12V5C4 6.65685 7.58172 8 12 8C16.4183 8 20 6.65685 20 5V12C20 13.6569 16.4183 15 12 15C7.58172 15 4 13.6569 4 12Z" fill="#334155" fill-opacity="0.5"/>
        <path d="M4 19V12C4 13.6569 7.58172 15 12 15C16.4183 15 20 13.6569 20 12V19C20 20.6569 16.4183 22 12 22C7.58172 22 4 20.6569 4 19Z" fill="#334155" fill-opacity="0.25"/>
      </svg>
    `;
    titleEl.prepend(dbIcon);
    
    const tablesContainer = document.createElement('div');
    tablesContainer.id = 'supabase-tables';
    tablesContainer.style.cssText = `
      display: grid;
      gap: 10px;
    `;
    
    sectionEl.appendChild(titleEl);
    sectionEl.appendChild(tablesContainer);
    contentEl.appendChild(sectionEl);
    return tablesContainer;
  }

  // Create a section for response data
  function createResponseSection() {
    // Create a hidden container for responses
    const responseContainer = document.createElement('div');
    responseContainer.id = 'supabase-responses';
    responseContainer.style.display = 'none'; // Hide it completely
    
    return responseContainer;
  }
  
  function addResponseInfoMessage() {
    // No-op since the response section is hidden
  }

  // Create modal for the Fix Table feature
  function createFixTableModal() {
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'supacheck-modal-overlay';
    modalOverlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(15, 23, 42, 0.6); z-index: 10000; display: none;
      align-items: center; justify-content: center;
      backdrop-filter: blur(3px);
      transition: opacity 0.3s ease;
      opacity: 0;
    `;
    
    const modal = document.createElement('div');
    modal.id = 'supacheck-fix-modal';
    modal.style.cssText = `
      background: white; border-radius: 12px; width: 90%; max-width: 600px;
      max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      display: flex; flex-direction: column; position: relative;
      transform: translateY(20px); transition: transform 0.3s cubic-bezier(0.2, 0, 0.2, 1);
    `;
    
    const modalHeader = document.createElement('div');
    modalHeader.style.cssText = `
      padding: 18px; border-bottom: 1px solid #e2e8f0; 
      background: linear-gradient(135deg, #3B82F6, #2563EB);
      color: white; font-weight: 600; display: flex; justify-content: space-between;
      align-items: center; border-top-left-radius: 12px; border-top-right-radius: 12px;
    `;
    
    const modalTitle = document.createElement('div');
    modalTitle.id = 'supacheck-modal-title';
    modalTitle.textContent = 'Restrict Columns Updates';
    modalTitle.style.cssText = 'font-size: 16px; letter-spacing: 0.2px;';
    
    const closeButton = document.createElement('span');
    closeButton.textContent = '×';
    closeButton.style.cssText = `
      cursor: pointer; font-size: 28px;
      height: 28px; width: 28px;
      display: flex; align-items: center; justify-content: center;
      transition: opacity 0.2s;
      opacity: 0.9;
    `;
    
    closeButton.onmouseover = () => {
      closeButton.style.opacity = '1';
    };
    
    closeButton.onmouseout = () => {
      closeButton.style.opacity = '0.9';
    };
    
    closeButton.onclick = () => {
      // Fade out animation
      modalOverlay.style.opacity = '0';
      modal.style.transform = 'translateY(20px)';
      
      setTimeout(() => {
        modalOverlay.style.display = 'none';
      }, 300);
    };
    
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);
    
    const modalContent = document.createElement('div');
    modalContent.id = 'supacheck-modal-content';
    modalContent.style.cssText = 'padding: 20px; flex-grow: 1;';
    
    const columnsContainer = document.createElement('div');
    columnsContainer.id = 'supacheck-columns-container';
    columnsContainer.style.cssText = 'margin-bottom: 20px;';
    
    const instructionsEl = document.createElement('div');
    instructionsEl.style.cssText = 'margin-bottom: 20px; color: #4b5563; line-height: 1.5;';
    
    // Create more informative instructions with icon
    instructionsEl.innerHTML = `
      <div style="display: flex; align-items: flex-start; margin-bottom: 16px;">
        <div style="margin-right: 12px; flex-shrink: 0; color: #3B82F6;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="2"/>
            <path d="M12 16V12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M12 8H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <div>
          <h3 style="font-weight: 600; font-size: 15px; margin-bottom: 6px; color: #1E293B;">Protect Your Table Data</h3>
          <p style="font-size: 14px;">Check the columns you want to limit users from updating. This will help secure sensitive data by generating Row Level Security (RLS) policies for your Supabase table.</p>
        </div>
      </div>
    `;
    
    const modalFooter = document.createElement('div');
    modalFooter.style.cssText = 'padding: 16px 20px; border-top: 1px solid #e2e8f0; text-align: right;';
    
    const generateButton = document.createElement('button');
    generateButton.id = 'supacheck-generate-button';
    generateButton.textContent = 'Show me the fix';
    generateButton.style.cssText = `
      background: linear-gradient(135deg, #3B82F6, #2563EB);
      color: white;
      padding: 10px 18px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 14px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: all 0.2s ease;
    `;
    
    // Add hover and active states for the button
    generateButton.onmouseover = () => {
      generateButton.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
      generateButton.style.transform = 'translateY(-1px)';
    };
    
    generateButton.onmouseout = () => {
      generateButton.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
      generateButton.style.transform = 'translateY(0)';
    };
    
    generateButton.onmousedown = () => {
      generateButton.style.transform = 'scale(0.98)';
    };
    
    generateButton.onmouseup = () => {
      generateButton.style.transform = 'scale(1)';
    };
    
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
      <div style="margin: 24px 0 16px; border-top: 1px solid #e2e8f0; padding-top: 24px;">
        <div style="display: flex; align-items: flex-start; margin-bottom: 20px;">
          <div style="margin-right: 12px; color: #22C55E; flex-shrink: 0;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="2"/>
              <path d="M16 10L11 15L8 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div>
            <h3 style="font-weight: 600; font-size: 16px; color: #1E293B; margin-bottom: 8px;">Your RLS Policy Is Ready</h3>
            <p style="font-size: 14px; color: #4B5563; line-height: 1.5;">Follow these steps to secure your table:</p>
          </div>
        </div>
        
        <ol style="margin-left: 20px; line-height: 1.6; color: #4B5563; margin-bottom: 16px; font-size: 14px;">
          <li>Go to your Supabase project dashboard</li>
          <li>Navigate to the SQL Editor</li>
          <li>Paste and run the policy below:</li>
        </ol>
        
        <div style="background: #F8FAFC; padding: 16px; border-radius: 8px; margin-top: 16px; overflow-x: auto; border: 1px solid #E2E8F0;">
          <pre style="margin: 0; white-space: pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; color: #334155; font-size: 13px; line-height: 1.5;">${policy}</pre>
        </div>
        
        <button id="copy-policy-button" style="background: #E2E8F0; border: none; border-radius: 6px; padding: 8px 16px; margin-top: 16px; font-size: 13px; cursor: pointer; display: flex; align-items: center; color: #334155; font-weight: 500;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 6px;">
            <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Copy Policy to Clipboard
        </button>
      </div>
    `;
    
    // Add copy functionality
    const copyButton = document.getElementById('copy-policy-button');
    copyButton.addEventListener('click', () => {
      navigator.clipboard.writeText(policy).then(() => {
        copyButton.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 6px;">
            <path d="M20 6L9 17L4 12" stroke="#22C55E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Copied!
        `;
        copyButton.style.background = '#D1FAE5';
        copyButton.style.color = '#15803D';
        
        setTimeout(() => {
          copyButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 6px;">
              <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Copy Policy to Clipboard
          `;
          copyButton.style.background = '#E2E8F0';
          copyButton.style.color = '#334155';
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy text: ', err);
      });
    });
    
    // Scroll to the result
    resultContainer.scrollIntoView({ behavior: 'smooth' });
  }
  
  // Display columns as checkboxes
  function displayColumns(columns) {
    const columnsContainer = document.getElementById('supacheck-columns-container');
    columnsContainer.innerHTML = '';
    
    const nonUpdatableFields = ['id', 'created_at', 'updated_at'];
    currentFixTableData.columns = columns;
    
    // Add column grid layout
    const columnGrid = document.createElement('div');
    columnGrid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
      margin-top: 16px;
    `;
    
    columns.forEach(column => {
      const isNonUpdatable = nonUpdatableFields.includes(column);
      
      const checkboxContainer = document.createElement('div');
      checkboxContainer.style.cssText = `
        background: ${isNonUpdatable ? '#F1F5F9' : '#F8FAFC'};
        padding: 10px 14px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        transition: background-color 0.2s ease;
        border: 1px solid ${isNonUpdatable ? '#E2E8F0' : '#F1F5F9'};
      `;
      
      if (!isNonUpdatable) {
        checkboxContainer.onmouseover = () => {
          checkboxContainer.style.background = '#F1F5F9';
          checkboxContainer.style.borderColor = '#E2E8F0';
        };
        
        checkboxContainer.onmouseout = () => {
          checkboxContainer.style.background = '#F8FAFC';
          checkboxContainer.style.borderColor = '#F1F5F9';
        };
      }
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `column-${column}`;
      checkbox.value = column;
      checkbox.style.cssText = `
        margin-right: 10px;
        cursor: ${isNonUpdatable ? 'not-allowed' : 'pointer'};
        width: 16px;
        height: 16px;
        accent-color: #2563EB;
      `;
      
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
      label.style.cssText = `
        cursor: ${isNonUpdatable ? 'not-allowed' : 'pointer'};
        color: ${isNonUpdatable ? '#94A3B8' : '#334155'};
        font-size: 14px;
        user-select: none;
      `;
      
      if (isNonUpdatable) {
        label.title = 'This field is typically not updatable';
      }
      
      checkboxContainer.appendChild(checkbox);
      checkboxContainer.appendChild(label);
      columnGrid.appendChild(checkboxContainer);
    });
    
    columnsContainer.appendChild(columnGrid);
    
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
    
    // Animate in
    setTimeout(() => {
      modalOverlay.style.opacity = '1';
      const modal = document.getElementById('supacheck-fix-modal');
      if (modal) {
        modal.style.transform = 'translateY(0)';
      }
    }, 10);
    
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
      padding: 12px 14px;
      background: #FFFFFF;
      border-radius: 8px;
      font-size: 13px;
      border-left: 3px solid #22C55E;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    `;
    
    // Add hover effect
    tableEl.onmouseover = () => {
      tableEl.style.transform = 'translateY(-1px)';
      tableEl.style.boxShadow = '0 3px 6px rgba(0, 0, 0, 0.1)';
    };
    
    tableEl.onmouseout = () => {
      tableEl.style.transform = 'translateY(0)';
      tableEl.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
    };
    
    const tableInfoEl = document.createElement('div');
    tableInfoEl.style.flexGrow = '1';
    
    const tableNameEl = document.createElement('div');
    tableNameEl.style.cssText = `
      font-weight: 600;
      color: #334155;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
    `;
    
    // Add table icon
    const tableIcon = document.createElement('span');
    tableIcon.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 6px;">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="#334155" stroke-width="2"/>
        <line x1="3" y1="9" x2="21" y2="9" stroke="#334155" stroke-width="2"/>
        <line x1="3" y1="15" x2="21" y2="15" stroke="#334155" stroke-width="2"/>
        <line x1="9" y1="3" x2="9" y2="21" stroke="#334155" stroke-width="2"/>
      </svg>
    `;
    
    tableNameEl.appendChild(tableIcon);
    tableNameEl.appendChild(document.createTextNode(tableName));
    
    const endpointEl = document.createElement('div');
    endpointEl.style.cssText = `
      font-size: 11px;
      color: #64748B;
      word-break: break-all;
      margin-top: 2px;
    `;
    
    // Format endpoint to be more readable
    let displayEndpoint = endpoint;
    try {
      const url = new URL(endpoint);
      const pathWithQuery = url.pathname + url.search;
      displayEndpoint = pathWithQuery; 
    } catch(e) {}
    
    endpointEl.textContent = displayEndpoint;
    
    // Add Fix Table button
    const fixTableBtn = document.createElement('button');
    fixTableBtn.textContent = 'Fix Table';
    fixTableBtn.style.cssText = `
      background-color: #22C55E;
      color: white;
      border: none;
      border-radius: 6px;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      margin-left: 10px;
      white-space: nowrap;
      transition: background-color 0.2s ease, transform 0.1s ease;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    `;
    
    // Add button hover and active states
    fixTableBtn.onmouseover = () => {
      fixTableBtn.style.backgroundColor = '#16A34A';
    };
    
    fixTableBtn.onmouseout = () => {
      fixTableBtn.style.backgroundColor = '#22C55E';
    };
    
    fixTableBtn.onmousedown = () => {
      fixTableBtn.style.transform = 'scale(0.98)';
    };
    
    fixTableBtn.onmouseup = () => {
      fixTableBtn.style.transform = 'scale(1)';
    };
    
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
      border-left: 3px solid #2563eb;
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
      endpointText.innerHTML = `<span style="color: #2563eb;">${title}</span><br><span style="font-size: 11px; color: #64748B;">${endpointPath}</span>`;
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
                
                // Create text element for the button
                const textEl = document.createElement('span');
                textEl.textContent = 'Test';
                
                // Add button container with modern styling
                buttonEl.style.cssText = `
                    display: flex;
                    align-items: center;
                    padding: 4px 8px;
                    font-size: 11px;
                    font-weight: 500;
                    cursor: pointer;
                    border: none;
                    border-radius: 4px;
                    background: #2563eb;
                    color: white;
                    margin-left: auto;
                    flex-shrink: 0;
                    transition: all 0.2s ease;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
                `;
                
                // Add hover effect using mouseover/mouseout
                buttonEl.onmouseover = () => {
                    buttonEl.style.background = '#2563EB';
                    buttonEl.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                };
                
                buttonEl.onmouseout = () => {
                    buttonEl.style.background = '#2563eb';
                    buttonEl.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.1)';
                };
                
                // Add active state for when button is pressed
                buttonEl.onmousedown = () => {
                    buttonEl.style.background = '#1D4ED8';
                    buttonEl.style.transform = 'translateY(1px)';
                };
                
                buttonEl.onmouseup = () => {
                    buttonEl.style.background = '#2563EB';
                    buttonEl.style.transform = 'translateY(0)';
                };
                
                buttonEl.appendChild(textEl);
                
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
    spinner.style.cssText = 'width: 16px; height: 16px; border: 2px solid #2563eb; border-top-color: transparent; border-radius: 50%; margin-right: 10px; animation: spin 1s linear infinite;';

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
    try {
      let finalSupabaseUrl = null;
      let finalSupabaseKey = null;
      
      logDebug("Starting Supabase credentials search");
      
      // 1. First check localStorage - fastest and most reliable source
      logDebug("Checking localStorage");
      const localStorageResults = checkLocalStorage();
      if (localStorageResults && (localStorageResults.url || localStorageResults.key)) {
        logDebug("Found credentials in localStorage", localStorageResults);
        finalSupabaseUrl = localStorageResults.url;
        finalSupabaseKey = localStorageResults.key;
        
        // If we have both, return immediately
        if (finalSupabaseUrl && finalSupabaseKey) {
          return { supabaseUrl: finalSupabaseUrl, supabaseKey: finalSupabaseKey };
        }
      }
      
      // 2. Check inline scripts
      logDebug("Checking inline scripts");
      const inlineScripts = document.querySelectorAll('script:not([src])');
      
      for (const script of inlineScripts) {
        if (script.textContent) {
          const result = checkScriptContent(script.textContent);
          if (result) {
            logDebug("Found credentials in inline script", { 
              url: result.url, 
              hasKey: !!result.key 
            });
            
            finalSupabaseUrl = finalSupabaseUrl || result.url;
            finalSupabaseKey = finalSupabaseKey || result.key;
            
            // If we have both, return immediately
            if (finalSupabaseUrl && finalSupabaseKey) {
              return { supabaseUrl: finalSupabaseUrl, supabaseKey: finalSupabaseKey };
            }
          }
        }
      }
      
      // 3. Check environment variables in HTML (meta tags)
      logDebug("Checking environment variables in meta tags");
      document.querySelectorAll('meta').forEach(meta => {
        try {
          const name = meta.getAttribute('name') || '';
          const content = meta.getAttribute('content') || '';
          
          // Check for Supabase URL
          if ((name.toLowerCase().includes('supabase') || name.toLowerCase().includes('api')) && 
              content.includes('supabase.co')) {
            const urlMatch = content.match(/(https?:\/\/[a-zA-Z0-9-]+\.supabase\.co)/i);
            if (urlMatch) {
              finalSupabaseUrl = finalSupabaseUrl || urlMatch[1];
              logDebug(`Found Supabase URL in meta tag: ${finalSupabaseUrl}`);
            }
          }
          
          // Check for API key
          if ((name.toLowerCase().includes('supabase') || name.toLowerCase().includes('key') || 
               name.toLowerCase().includes('token')) && content.length > 20) {
            const keyMatch = content.match(/(eyJ[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]*)/);
            if (keyMatch) {
              finalSupabaseKey = finalSupabaseKey || keyMatch[1];
              logDebug(`Found potential API key in meta tag: ${finalSupabaseKey.substring(0, 10)}...`);
            }
          }
        } catch (e) {
          // Ignore errors with individual meta tags
        }
      });
      
      // If we have both from metadata, return immediately
      if (finalSupabaseUrl && finalSupabaseKey) {
        return { supabaseUrl: finalSupabaseUrl, supabaseKey: finalSupabaseKey };
      }
      
      // 4. Fetch and analyze external scripts
      try {
        logDebug("Fetching external scripts");
        const { contents } = await fetchAndAnalyzeScripts();
        logDebug(`Analyzing ${contents.length} external scripts`);

        for (const scriptData of contents) {
          if (scriptData.content) {
            const result = checkScriptContent(scriptData.content);
            if (result) {
              logDebug("Found credentials in external script", { 
                url: result.url, 
                hasKey: !!result.key,
                script: scriptData.url
              });
              
              finalSupabaseUrl = finalSupabaseUrl || result.url;
              finalSupabaseKey = finalSupabaseKey || result.key;
              
              // If we have both, break and return
              if (finalSupabaseUrl && finalSupabaseKey) {
                break;
              }
            }
          }
        }
      } catch (e) {
        logError("Error fetching or analyzing external scripts", e);
        // Continue with what we have so far
      }
      
      // 5. Last resort: Try to extract from window or document properties
      if (!finalSupabaseUrl || !finalSupabaseKey) {
        logDebug("Trying to extract from global window object");
        // Convert window to string and search
        try {
          // This is a bit hacky but can sometimes find values in closures
          const windowStr = document.documentElement.innerHTML;
          const result = checkScriptContent(windowStr);
          if (result) {
            finalSupabaseUrl = finalSupabaseUrl || result.url;
            finalSupabaseKey = finalSupabaseKey || result.key;
            logDebug("Found credentials in document HTML", { 
              url: !!finalSupabaseUrl, 
              hasKey: !!finalSupabaseKey 
            });
          }
        } catch (e) {
          logError("Error extracting from window object", e);
        }
      }
      
      // Store the key globally for other functions to use
      if (finalSupabaseKey) {
        window._supabaseAnonKey = finalSupabaseKey;
        logDebug("Stored API key globally");
      }

      logDebug("Credentials search complete", { 
        foundUrl: !!finalSupabaseUrl, 
        foundKey: !!finalSupabaseKey 
      });
      
      return { supabaseUrl: finalSupabaseUrl, supabaseKey: finalSupabaseKey };
    } catch (error) {
      logError("Error in findSupabaseCredentials", error);
      return { supabaseUrl: null, supabaseKey: null };
    }
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
    
    // Create hidden response container
    const responsesContainer = createResponseSection();
    document.body.appendChild(requestsContainer); // Attach to DOM but hidden
    document.body.appendChild(responsesContainer); // Attach to DOM but hidden
    
    // First, check for existing requests using Performance API
    const { requests, tableNames } = analyzePerformanceEntries(supabaseUrl);
    
    // Add any additional tables from headers
    const headerTables = checkForHeaderTables();
    const allTables = [...new Set([...tableNames, ...headerTables])];
    
    // Process existing requests without UI updates
    if (requests.length > 0) {
      requestCount = requests.length;
      
      // Process those requests without adding UI elements
      for (const req of requests) {
        // Just process table data without UI
        processRequestForTableData(req.method, req.url);
      }
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
          
          // Intercept and capture the response
          p.then(function(response) {
            try {
              const method = (init && init.method) ? init.method : 'GET';
              // Use processRequestForTableData instead of addRequestEntry
              processRequestForTableData(method, url);
              
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
            // Use processRequestForTableData instead of addRequestEntry
            processRequestForTableData(this._supaRequestMethod || 'GET', this._supaRequestUrl);
            
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
    
    // Replace addRequestEntry with a function that just processes data without UI
    function addRequestEntry(method, url) {
      // Skip our own verification requests
      if (isVerificationRequest(url)) {
        return;
      }
      
      // Process the request for table data without creating UI elements
      processRequestForTableData(method, url);
    }
    
    // New function to process request data without UI
    function processRequestForTableData(method, url) {
      // Extract table name if present
      if (url.includes('/rest/v1/')) {
        const tableName = extractTableNameFromUrl(url);
        if (tableName) {
          // Add to discovered tables if not already added
          window._discoveredTableNames.add(tableName);
          // Add table UI entry (keeping this as it's useful information)
          addTableEntry(tableName, url);
        }
      }
    }
    
    // Update the request counter (no UI updates needed)
    function updateRequestCount() {
      requestCount++;
      // No visible counter updates needed
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
    // Prevent multiple initializations
    if (hasInitialized) {
      logDebug("Script already initialized, skipping");
      return;
    }
    hasInitialized = true;
    
    try {
      // Add keyframe animations
      addKeyframeAnimations();
      
      // Start with user feedback
      logDebug("Starting Supabase security checks");
      const loadingEl = showLoading();
      
      // Set up error handling
      window.addEventListener('error', function(event) {
        logError("Unhandled error in script", event.error);
        hideLoading();
        addStatusItem('Script Error', 'Check Console', false);
      });
      
      // Find Supabase credentials with timeout
      let timeoutId = setTimeout(() => {
        logError("Credential search timed out after 10 seconds");
        hideLoading();
        addStatusItem('Supabase Search', 'Timed Out', false);
      }, 10000); // 10 second timeout
      
      // Find Supabase credentials
      const { supabaseUrl, supabaseKey } = await findSupabaseCredentials();
      
      // Clear timeout since we got a response
      clearTimeout(timeoutId);
      
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
          logDebug("User JWT found in cookies and stored globally.");
        }
        // <--- END NEW
        
        // Start monitoring network requests and discover tables
        const discoveredTables = monitorNetworkRequests(supabaseUrl);
        
        // Verify tables and check RLS
        try {
          const { rlsConfigured, existingTables } = await verifyTablesAndCheckRLS(supabaseUrl, supabaseKey, discoveredTables);
          addStatusItem('Row Level Security', 
                       rlsConfigured ? 'Potentially Configured (Anon Limited)' : '⚠️ Not Configured (Anon Access Detected)', 
                       rlsConfigured);
        } catch (error) {
          logError("Error checking RLS status", error);
          addStatusItem('Row Level Security', 'Error Checking', false);
        }

        // ---> NEW: After checks, if we have JWT from cookies & discovered tables, ensure fetches happened
        if (window._currentUserJwt && window._discoveredTableNames.size > 0) {
           logDebug("Re-checking discovered tables against cookie JWT...");
           window._discoveredTableNames.forEach(tableName => {
              // Check if auth data already exists for this table to avoid duplicate fetches
              if (!document.getElementById(`json-container-auth-data-${tableName}`)) {
                  logDebug(`Triggering auth fetch for discovered table '${tableName}' using cookie JWT.`);
                  fetchAndDisplayAuthData(supabaseUrl, tableName, window._currentUserJwt, supabaseKey);
              }
           });
        }
        // <--- END NEW

        // Add CORS info message
        addCorsInfoMessage();
      } else {
        if (supabaseUrl) {
          addStatusItem('Supabase URL', 'Found, Missing Key', false);
          logDebug("Found Supabase URL but no API key");
        } else if (supabaseKey) {
          addStatusItem('Supabase Key', 'Found, Missing URL', false);
          logDebug("Found Supabase key but no URL");
        } else {
          addStatusItem('Supabase', 'Not Found', true);
          logDebug("No Supabase credentials found");
        }
      }
    } catch (error) {
      logError("Error in runChecks", error);
      hideLoading();
      addStatusItem('Supabase Check', 'Failed', false);
    }
  }

  // Try to start checks when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runChecks);
  } else {
    // DOM already loaded, run checks directly
    runChecks();
  }

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
    const button = event.target.tagName === 'BUTTON' ? event.target : event.target.closest('button');
    const { baseUrl, tableName, primaryKeyColumn, primaryKeyValue, columnName, originalValue: originalValueStr } = button.dataset;
    const statusEl = document.getElementById(`test-status-${tableName}-${columnName}-${primaryKeyValue}`);

    if (!statusEl || !window._currentUserJwt || !window._supabaseAnonKey) {
        logError("Missing context for update test:", button.dataset);
        if (statusEl) statusEl.textContent = 'Error: Missing context';
        return;
    }

    let originalValue;
    try {
      originalValue = JSON.parse(originalValueStr);
    } catch (e) {
      logError("Failed to parse original value:", originalValueStr, e);
      statusEl.textContent = 'Error: Bad original value';
      return;
    }

    const modifiedValue = getModifiedValue(originalValue);
    const patchUrl = `${baseUrl}/rest/v1/${tableName}?${primaryKeyColumn}=eq.${primaryKeyValue}`;
    const apiKey = window._supabaseAnonKey;
    const userToken = window._currentUserJwt;

    logDebug(`Testing PATCH for ${tableName}.${columnName} (ID: ${primaryKeyValue})`);
    
    // Improved loading state
    const originalButtonContent = button.innerHTML;
    button.innerHTML = '<span style="display: inline-block; width: 12px; height: 12px; border: 2px solid white; border-top-color: transparent; border-radius: 50%; margin-right: 6px; animation: spin 1s linear infinite;"></span><span style="animation: pulse 1.5s ease infinite;">Testing...</span>';
    button.style.opacity = '0.8';
    button.disabled = true;
    
    statusEl.textContent = '';
    statusEl.style.color = '#6b7280';

    let updateSuccess = false;
    let errorMessage = '';

    // --- First PATCH: Attempt to update with modified value ---
    try {
      const patchBody = { [columnName]: modifiedValue };
      logDebug("PATCH 1 Body:", patchBody);

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
        logDebug(`✅ PATCH 1 successful for ${tableName}.${columnName}. Column is updatable.`);
        updateSuccess = true;
      } else {
        logError(`❌ PATCH 1 failed for ${tableName}.${columnName} (Status: ${response.status})`);
        errorMessage = `Status ${response.status}`;
        try {
           const errJson = await response.json();
           errorMessage += `: ${errJson.message || 'Unknown error'}`;
        } catch(e) { /* ignore */ }
      }
    } catch (error) {
      logError(`❌ Network error during PATCH 1 for ${tableName}.${columnName}:`, error);
      errorMessage = 'Network Error';
      updateSuccess = false;
    }

    // --- Second PATCH: Revert to original value (always attempt) ---
    try {
      const revertBody = { [columnName]: originalValue };
      logDebug("PATCH 2 (Revert) Body:", revertBody);

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
        logError(`⚠️ PATCH 2 (Revert) failed for ${tableName}.${columnName} (Status: ${revertResponse.status})! Manual check needed.`);
        // Optionally update UI to indicate revert failure
        errorMessage += ' (Revert Failed!)'; 
      } else {
        logDebug(`PATCH 2 (Revert) successful for ${tableName}.${columnName}.`);
      }
    } catch (error) {
      logError(`⚠️ Network error during PATCH 2 (Revert) for ${tableName}.${columnName}:`, error);
      errorMessage += ' (Revert Network Error!)';
    }

    // --- Update UI ---
    // Restore button
    button.innerHTML = originalButtonContent;
    button.style.opacity = '1';
    button.disabled = false;
    
    if (updateSuccess) {
      statusEl.innerHTML = '<span style="color: #15803d; font-weight: bold;">✅ Updatable</span>';
    } else {
      statusEl.innerHTML = `<span style="color: #b91c1c; font-weight: bold;">❌ Not Updatable</span> <span style="color: #6b7280; font-size: 9px;">(${errorMessage})</span>`;
    }
}
  // <--- END NEW

  // Store current table data for the modal
  let currentFixTableData = {
    tableName: null,
    columns: []
  };

  // Fetch columns for a table
  async function fetchTableColumns(baseUrl, tableName, apiKey) {
    const columnsContainer = document.getElementById('supacheck-columns-container');
    columnsContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: #64748B; display: flex; align-items: center; justify-content: center; gap: 10px;"><div style="width: 20px; height: 20px; border: 2px solid #3B82F6; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>Loading columns...</div>';
    
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
        <div style="color: #ef4444; padding: 16px; background: #FEF2F2; border-radius: 8px; margin-bottom: 16px; border: 1px solid #FEE2E2;">
          <h4 style="font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#EF4444" stroke-width="2"/>
              <path d="M12 8V12" stroke="#EF4444" stroke-width="2" stroke-linecap="round"/>
              <path d="M12 16H12.01" stroke="#EF4444" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Could not retrieve columns automatically
          </h4>
          <p style="margin-bottom: 12px; font-size: 14px; line-height: 1.5;">Please enter the column names manually:</p>
          
          <div style="margin-top: 16px; color: #6B7280; font-size: 13px; padding: 12px; background: #F9FAFB; border-radius: 6px;">
            <p style="margin-bottom: 6px; font-weight: 500;">This may happen if:</p>
            <ul style="list-style-type: disc; margin-left: 20px; margin-top: 8px; line-height: 1.5;">
              <li>The table is empty (no rows to analyze)</li>
              <li>Row Level Security (RLS) is blocking access</li>
              <li>The table exists but you don't have permission to view it</li>
            </ul>
          </div>
          
          <div style="margin-top: 16px;">
            <textarea id="columns-manual-input" style="width: 100%; height: 120px; padding: 12px; border: 1px solid #E5E7EB; border-radius: 6px; font-family: ui-monospace, SFMono-Regular, Monaco, 'Courier New', monospace; font-size: 13px;" 
              placeholder="Enter column names, one per line"></textarea>
          </div>
          
          <div style="margin-top: 16px;">
            <button id="add-manual-columns" style="background: linear-gradient(135deg, #3B82F6, #2563EB); color: white; padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1); transition: all 0.2s ease;">
              Add Columns
            </button>
          </div>
        </div>
      `;
      
      // Set up button for manual column entry with hover effects
      const addButton = document.getElementById('add-manual-columns');
      
      addButton.onmouseover = () => {
        addButton.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        addButton.style.transform = 'translateY(-1px)';
      };
      
      addButton.onmouseout = () => {
        addButton.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.1)';
        addButton.style.transform = 'translateY(0)';
      };
      
      addButton.onclick = () => {
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
})(); 