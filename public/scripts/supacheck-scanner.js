// SupaCheck Simple Scanner v1.0
(function() {
  // Ensure we don\'t initialize multiple times
  if (window.__SUPACHECK_SCANNER) return;
  window.__SUPACHECK_SCANNER = true;
  
  console.log(\"[SupaCheck Simple] Scanner starting...\");

  // --- Configuration ---
  var WIDGET_ID = \'supacheck-simple-widget\';
  var URL_PATTERN = /([a-zA-Z0-9\\-_.]+\\.supabase\\.co)/g;
  var KEY_PATTERN = /eyJ[a-zA-Z0-9_.\\-]{40,}/g; // Anon key pattern
  var MAX_KEY_LENGTH = 500; // Avoid capturing large tokens
  var SCAN_TIMEOUT = 4000; // Max time for scanning external scripts
  // ---------------------

  var results = {
    url: null,
    key: null,
    detectionComplete: false
  };
  var widget = null;

  // --- Core Logic ---

  // Function to update or create the widget
  function updateWidget() {
    if (!widget) {
      widget = document.createElement(\'div\');
      widget.id = WIDGET_ID;
      // Basic styles (apply more specific styles if needed)
      widget.style.position = \'fixed\';
      widget.style.bottom = \'20px\';
      widget.style.right = \'20px\';
      widget.style.padding = \'10px 15px\';
      widget.style.borderRadius = \'6px\';
      widget.style.fontSize = \'13px\';
      widget.style.fontFamily = \'system-ui, sans-serif\';
      widget.style.boxShadow = \'0 2px 8px rgba(0,0,0,0.15)\';
      widget.style.zIndex = \'999999\';
      widget.style.transition = \'background-color 0.3s ease\';
      document.body.appendChild(widget);
    }

    var message = \'\';
    var urlFound = !!results.url;
    var keyFound = !!results.key;

    if (urlFound && keyFound) {
      message = \'✅ Supabase URL & Key Detected\';
      widget.style.backgroundColor = \'#dcfce7\'; // Green background
      widget.style.color = \'#166534\';
      widget.style.border = \'1px solid #86efac\';
    } else if (urlFound) {
      message = \'⚠️ Supabase URL Detected (Key Not Found)\';
      widget.style.backgroundColor = \'#fef9c3\'; // Yellow background
      widget.style.color = \'#854d0e\';
      widget.style.border = \'1px solid #fde047\';
    } else if (keyFound) {
      message = \'⚠️ Supabase Key Detected (URL Not Found)\';
      widget.style.backgroundColor = \'#fef9c3\'; // Yellow background
      widget.style.color = \'#854d0e\';
      widget.style.border = \'1px solid #fde047\';
    } else if (results.detectionComplete) {
       message = \'❌ Supabase Not Detected\';
       widget.style.backgroundColor = \'#f3f4f6\'; // Gray background
       widget.style.color = \'#4b5563\';
       widget.style.border = \'1px solid #d1d5db\';
    } else {
       message = \'⏳ Scanning for Supabase...\'; // Initial state
       widget.style.backgroundColor = \'#e0f2fe\'; // Blue background
       widget.style.color = \'#0c4a6e\';
       widget.style.border = \'1px solid #7dd3fc\';
    }
    
    widget.innerHTML = message; // Simple text display
    if (results.url) widget.innerHTML += \'<br/><code style=\"font-size:11px\">URL: \' + results.url + \'</code>\';
    if (results.key) widget.innerHTML += \'<br/><code style=\"font-size:11px\">Key: \' + results.key.substring(0,10) + \'...</code>\';
  }

  // Function to check content for Supabase URL and Key
  function checkContentForSupabase(content) {
    if (!content) return;
    
    try {
      // Check for Supabase URLs
      if (!results.url) {
        var urlMatches = content.match(URL_PATTERN);
        if (urlMatches && urlMatches[0]) {
          console.log(\"[SupaCheck Simple] Found Supabase URL:\", urlMatches[0]);
          results.url = urlMatches[0];
          updateWidget();
        }
      }
      
      // Check for potential Anon keys
      if (!results.key) {
        var keyMatches = content.match(KEY_PATTERN);
        if (keyMatches && keyMatches[0]) {
          if (keyMatches[0].length < MAX_KEY_LENGTH) { 
            console.log(\"[SupaCheck Simple] Found potential Supabase Anon Key.\");
            results.key = keyMatches[0];
            updateWidget();
          }
        }
      }
    } catch (err) {
      console.error(\"[SupaCheck Simple] Error checking content:\", err);
    }
  }

  // Fetch content helper
  function fetchContent(url, callback) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open(\'GET\', url, true);
      xhr.timeout = SCAN_TIMEOUT - 500; // Set timeout slightly less than overall
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            callback(xhr.responseText);
          } else {
             console.warn(\"[SupaCheck Simple] Failed to fetch external script:\", url, \"Status:\", xhr.status);
             callback(null); // Indicate fetch failure
          }
        }
      };
      xhr.onerror = function() {
         console.error(\"[SupaCheck Simple] Network error fetching external script:\", url);
         callback(null); // Indicate fetch failure
      };
       xhr.ontimeout = function () {
         console.warn(\"[SupaCheck Simple] Timeout fetching external script:\", url);
         callback(null); // Indicate fetch failure
       };
      xhr.send();
    } catch (err) {
      console.error(\"[SupaCheck Simple] Error initiating fetch for \" + url, err);
      callback(null); // Indicate fetch failure
    }
  }

  // --- Main Execution ---
  try {
    var scripts = document.querySelectorAll(\'script\');
    var externalScriptPromises = [];

    // Initial widget state
    updateWidget();

    // Scan inline scripts
    console.log(\"[SupaCheck Simple] Scanning\", scripts.length, \"script tags...\");
    for (var i = 0; i < scripts.length; i++) {
      checkContentForSupabase(scripts[i].textContent || \'\');
      
      // Collect promises for external scripts
      var src = scripts[i].getAttribute(\'src\');
      if (src && src.endsWith(\'.js\')) {
        externalScriptPromises.push(
          new Promise(function(resolve) {
            fetchContent(src, function(externalContent) {
              if (externalContent) {
                  checkContentForSupabase(externalContent);
              }
              resolve(); // Resolve even if fetch failed
            });
          })
        );
      }
    }

    // Scan HTML after inline scripts
    console.log(\"[SupaCheck Simple] Scanning HTML...\");
    checkContentForSupabase(document.documentElement.innerHTML);

    // Function to run after all checks (including external scripts or timeout)
    var finalizeScan = function() {
      if (results.detectionComplete) return;
      console.log(\"[SupaCheck Simple] Finalizing scan.\");
      results.detectionComplete = true;
      updateWidget(); // Update widget to final state
    };

    // Wait for external scripts or timeout
    if (externalScriptPromises.length > 0) {
      console.log(\"[SupaCheck Simple] Waiting for\", externalScriptPromises.length, \"external scripts...\");
      Promise.all(externalScriptPromises).then(finalizeScan).catch(function(err){
          console.error(\"[SupaCheck Simple] Error processing external scripts:\", err);
          finalizeScan(); // Finalize even on error
      });
    } else {
       // No external scripts, finalize immediately after HTML scan
       finalizeScan();
    }

    // Set a safety timeout
    setTimeout(finalizeScan, SCAN_TIMEOUT);

  } catch (err) {
    console.error(\"[SupaCheck Simple] Unhandled error during Supabase scan:\", err);
    results.detectionComplete = true;
    updateWidget(); // Show error state potentially
  }

})(); 