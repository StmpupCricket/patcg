// src/index.js - Advanced sandbox bypass
export default {
  async fetch(request) {
    try {
      const url = new URL(request.url);
      const targetUrl = url.searchParams.get('url');
      
      if (!targetUrl) {
        return new Response(getEmbedderPage(), {
          headers: { 'Content-Type': 'text/html' }
        });
      }

      const sanitizedUrl = sanitizeUrl(targetUrl);
      if (!sanitizedUrl) {
        return new Response('Invalid URL', { 
          status: 400,
          headers: { 'Content-Type': 'text/plain' }
        });
      }

      // Fetch with multiple user agents to avoid detection
      const response = await fetch(sanitizedUrl, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1'
        }
      });

      const contentType = response.headers.get('content-type') || '';
      let body = await response.text();

      if (contentType.includes('text/html')) {
        body = injectAdvancedBypass(body, sanitizedUrl);
        
        // Remove restrictive headers
        const headers = new Headers(response.headers);
        headers.set('X-Frame-Options', 'ALLOWALL');
        headers.set('Content-Security-Policy', "frame-ancestors 'self' *;");
        headers.set('Cross-Origin-Opener-Policy', 'unsafe-none');
        headers.set('Cross-Origin-Embedder-Policy', 'unsafe-none');
        headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
        headers.delete('X-Frame-Options');
        
        return new Response(body, {
          status: response.status,
          headers: headers
        });
      }

      return new Response(body, {
        status: response.status,
        headers: response.headers
      });

    } catch (error) {
      console.error('Error:', error);
      return new Response('Error: ' + error.message, { 
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  }
};

function getRandomUserAgent() {
  const agents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ];
  return agents[Math.floor(Math.random() * agents.length)];
}

function sanitizeUrl(url) {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function injectAdvancedBypass(html, targetUrl) {
  // Multiple bypass techniques
  const bypassScript = `
  <script>
    // === ADVANCED SANDBOX BYPASS ===
    (function() {
      console.log('🚀 Initializing sandbox bypass for: ${targetUrl}');
      
      // 1. OVERRIDE WINDOW PROPERTIES
      function overrideWindowProps() {
        // Override parent/top to prevent frame detection
        if (window.top !== window.self) {
          Object.defineProperty(window, 'top', {
            get: function() { return window.self; },
            configurable: false,
            enumerable: true
          });
          Object.defineProperty(window, 'parent', {
            get: function() { return window.self; },
            configurable: false,
            enumerable: true
          });
          Object.defineProperty(window, 'frameElement', {
            get: function() { return null; },
            configurable: false
          });
        }

        // Override location
        const origLocation = window.location;
        Object.defineProperty(window, 'location', {
          get: function() { return origLocation; },
          set: function(val) { 
            // Block navigation attempts
            return; 
          },
          configurable: false
        });
      }
      
      // 2. OVERRIDE SANDBOX ATTRIBUTES
      function overrideSandbox() {
        // Override createElement
        const origCreate = document.createElement;
        document.createElement = function(tag) {
          const el = origCreate.call(this, tag);
          if (tag && tag.toLowerCase() === 'iframe') {
            // Remove sandbox
            el.removeAttribute('sandbox');
            // Block sandbox property
            Object.defineProperty(el, 'sandbox', {
              get: () => null,
              set: () => {},
              configurable: false
            });
            // Add allow attributes
            el.setAttribute('allow', 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture');
            el.setAttribute('allowfullscreen', 'true');
            el.setAttribute('allowpaymentrequest', 'true');
          }
          return el;
        };

        // Override iframe prototype
        try {
          const iframeProto = Object.getPrototypeOf(document.createElement('iframe'));
          Object.defineProperty(iframeProto, 'sandbox', {
            get: () => null,
            set: () => {},
            configurable: false
          });
        } catch(e) {}
      }

      // 3. BLOCK DETECTION SCRIPTS
      function blockDetectionScripts() {
        // Remove existing detection
        const scripts = document.querySelectorAll('script');
        scripts.forEach(script => {
          const content = script.textContent || '';
          const src = script.src || '';
          const keywords = ['sandbox', 'detect', 'frame', 'top', 'parent', 'cross-origin', 'x-frame'];
          const hasKeyword = keywords.some(keyword => 
            content.toLowerCase().includes(keyword) || 
            src.toLowerCase().includes(keyword)
          );
          if (hasKeyword && script.parentNode) {
            script.parentNode.removeChild(script);
          }
        });

        // Remove detection meta tags
        const metas = document.querySelectorAll('meta[http-equiv="X-Frame-Options"], meta[name="referrer"]');
        metas.forEach(m => {
          if (m.parentNode) m.parentNode.removeChild(m);
        });

        // Remove CSP headers injected by JS
        const styles = document.querySelectorAll('style');
        styles.forEach(style => {
          if (style.textContent.includes('frame-ancestors')) {
            style.textContent = '';
          }
        });
      }

      // 4. INTERCEPT FETCH AND XHR
      function interceptNetworkRequests() {
        // Intercept fetch
        const origFetch = window.fetch;
        window.fetch = function(...args) {
          const headers = args[1]?.headers || {};
          // Remove restrictive headers
          delete headers['X-Frame-Options'];
          delete headers['Content-Security-Policy'];
          // Add allow headers
          headers['X-Frame-Options'] = 'ALLOWALL';
          return origFetch.apply(this, args);
        };

        // Intercept XMLHttpRequest
        const origOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(...args) {
          // Remove restrictive headers
          this.setRequestHeader = function(name, value) {
            if (name.toLowerCase() === 'x-frame-options' || 
                name.toLowerCase() === 'content-security-policy') {
              return;
            }
            return origSetRequestHeader.call(this, name, value);
          };
          const origSetRequestHeader = this.setRequestHeader;
          return origOpen.apply(this, args);
        };
      }

      // 5. MUTATION OBSERVER FOR DYNAMIC DETECTION
      function setupMutationObserver() {
        const observer = new MutationObserver(function(mutations) {
          mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
              if (node.nodeType === 1) {
                // Remove suspicious scripts
                if (node.tagName === 'SCRIPT') {
                  const content = node.textContent || '';
                  const src = node.src || '';
                  if (content.includes('sandbox') || 
                      content.includes('detect') || 
                      src.includes('sandbox')) {
                    if (node.parentNode) {
                      node.parentNode.removeChild(node);
                    }
                  }
                }
                // Remove sandbox attributes from iframes
                if (node.tagName === 'IFRAME' && node.hasAttribute('sandbox')) {
                  node.removeAttribute('sandbox');
                }
                // Remove restrictive meta tags
                if (node.tagName === 'META' && 
                    node.getAttribute('http-equiv') === 'X-Frame-Options') {
                  if (node.parentNode) {
                    node.parentNode.removeChild(node);
                  }
                }
              }
            });
          });
        });
        observer.observe(document.documentElement, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['sandbox']
        });
      }

      // 6. POSTMESSAGE INTERCEPTION
      function interceptPostMessage() {
        const origPostMessage = window.postMessage;
        window.postMessage = function(message, targetOrigin, transfer) {
          // Block messages that might detect embedding
          if (typeof message === 'string') {
            const blockedKeywords = ['sandbox', 'frame', 'detect', 'origin', 'parent'];
            if (blockedKeywords.some(k => message.toLowerCase().includes(k))) {
              console.log('🔒 Blocked postMessage:', message);
              return;
            }
          }
          return origPostMessage.call(this, message, targetOrigin, transfer);
        };
      }

      // 7. OVERRIDE DOCUMENT DOMAIN
      function overrideDocumentDomain() {
        try {
          Object.defineProperty(document, 'domain', {
            get: function() { return window.location.hostname; },
            set: function(val) { /* Block changes */ },
            configurable: false
          });
        } catch(e) {}
      }

      // 8. BLOCK CONSOLE DETECTION
      function blockConsoleDetection() {
        const origLog = console.log;
        console.log = function(...args) {
          // Filter out detection messages
          const msg = args.join(' ');
          if (msg.includes('sandbox') || msg.includes('detect')) {
            return;
          }
          return origLog.apply(this, args);
        };
      }

      // 9. OVERRIDE REFERRER
      function overrideReferrer() {
        try {
          Object.defineProperty(document, 'referrer', {
            get: function() { return ''; },
            configurable: false
          });
        } catch(e) {}
      }

      // Execute all bypasses
      try {
        overrideWindowProps();
        overrideSandbox();
        blockDetectionScripts();
        interceptNetworkRequests();
        setupMutationObserver();
        interceptPostMessage();
        overrideDocumentDomain();
        blockConsoleDetection();
        overrideReferrer();
        console.log('✅ All sandbox bypasses applied successfully');
      } catch(e) {
        console.log('⚠️ Bypass error:', e);
      }

      // Additional: Override navigator
      try {
        const nav = navigator;
        Object.defineProperty(navigator, 'webdriver', {
          get: () => false,
          configurable: false
        });
      } catch(e) {}
    })();
  </script>
  `;

  // Inject CSS to hide any detection overlays
  const bypassCSS = `
  <style>
    /* Hide any detection overlays */
    .sandbox-detection, 
    .frame-detection,
    [class*="sandbox"],
    [class*="detect"] {
      display: none !important;
      opacity: 0 !important;
      visibility: hidden !important;
      pointer-events: none !important;
    }
  </style>
  `;

  // Inject as early as possible
  let modifiedHtml = html;
  if (modifiedHtml.includes('</head>')) {
    modifiedHtml = modifiedHtml.replace('</head>', bypassScript + bypassCSS + '</head>');
  } else if (modifiedHtml.includes('<body>')) {
    modifiedHtml = modifiedHtml.replace('<body>', '<body>' + bypassScript + bypassCSS);
  } else {
    modifiedHtml = bypassScript + bypassCSS + modifiedHtml;
  }

  return modifiedHtml;
}

function getEmbedderPage() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Advanced URL Embedder</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; background: #0a0a0a; padding: 20px; color: #fff; }
    .container { max-width: 1400px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 20px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #333; }
    .header h1 { color: #00d4ff; font-size: 24px; margin-bottom: 5px; }
    .header p { color: #888; font-size: 14px; }
    .controls { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 15px; }
    .controls input { flex: 1; padding: 12px 16px; background: #1a1a2e; border: 1px solid #333; border-radius: 8px; color: #fff; font-size: 16px; min-width: 200px; }
    .controls input:focus { outline: none; border-color: #00d4ff; }
    .controls button { padding: 12px 24px; background: linear-gradient(135deg, #00d4ff, #0099ff); color: #fff; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: 600; transition: transform 0.2s; }
    .controls button:hover { transform: scale(1.02); }
    .controls button:active { transform: scale(0.98); }
    .controls button.secondary { background: #333; }
    .controls button.secondary:hover { background: #444; }
    .frame-wrapper { background: #1a1a2e; border-radius: 12px; overflow: hidden; border: 1px solid #333; }
    .frame-wrapper iframe { width: 100%; height: 600px; border: none; display: block; background: #fff; }
    .loader { display: none; text-align: center; padding: 60px; color: #888; }
    .loader.show { display: block; }
    .loader .spinner { width: 40px; height: 40px; border: 3px solid #333; border-top-color: #00d4ff; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .info { margin-top: 15px; padding: 15px; background: #1a1a2e; border-radius: 8px; border: 1px solid #333; color: #888; font-size: 13px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
    .info .status { color: #00d4ff; }
    .info .status.error { color: #ff4444; }
    .badge { display: inline-block; padding: 4px 12px; background: #00d4ff20; border: 1px solid #00d4ff40; border-radius: 20px; color: #00d4ff; font-size: 12px; }
    .error-msg { display: none; color: #ff4444; padding: 20px; text-align: center; }
    .error-msg.show { display: block; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🛡️ Advanced URL Embedder</h1>
      <p>Bypasses sandbox detection using multiple techniques</p>
      <div class="controls">
        <input type="text" id="urlInput" placeholder="Enter URL (e.g., https://example.com)" value="https://example.com">
        <button id="loadBtn">🚀 Load with Bypass</button>
        <button id="directBtn" class="secondary">📄 Direct Iframe</button>
      </div>
    </div>
    <div class="frame-wrapper">
      <div id="loader" class="loader">
        <div class="spinner"></div>
        <div>Loading...</div>
      </div>
      <div id="errorMsg" class="error-msg">Failed to load URL</div>
      <iframe id="frame" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads allow-orientation-lock allow-pointer-lock allow-presentation allow-top-navigation"></iframe>
    </div>
    <div class="info">
      <span>🔒 Active bypasses: <span class="badge">Window Props</span> <span class="badge">Sandbox Override</span> <span class="badge">Mutation Observer</span> <span class="badge">Network Intercept</span></span>
      <span id="statusMsg" class="status">✅ Ready</span>
    </div>
  </div>
  <script>
    (function() {
      const urlInput = document.getElementById('urlInput');
      const loadBtn = document.getElementById('loadBtn');
      const directBtn = document.getElementById('directBtn');
      const frame = document.getElementById('frame');
      const loader = document.getElementById('loader');
      const errorMsg = document.getElementById('errorMsg');
      const statusMsg = document.getElementById('statusMsg');

      function loadUrl(url, mode) {
        if (!url) {
          alert('Please enter a URL');
          return;
        }
        
        try {
          new URL(url);
        } catch(e) {
          alert('Invalid URL. Please include http:// or https://');
          return;
        }

        // Reset UI
        loader.classList.add('show');
        errorMsg.classList.remove('show');
        frame.style.display = 'none';
        statusMsg.textContent = '🔄 Loading...';
        statusMsg.className = 'status';

        // Set iframe src
        const proxyUrl = window.location.origin + '?url=' + encodeURIComponent(url);
        frame.src = mode === 'proxy' ? proxyUrl : url;

        // Handle load
        frame.onload = function() {
          loader.classList.remove('show');
          frame.style.display = 'block';
          errorMsg.classList.remove('show');
          statusMsg.textContent = '✅ Loaded successfully';
          statusMsg.className = 'status';
          
          // Try to apply additional bypass on iframe content
          try {
            const frameDoc = frame.contentDocument || frame.contentWindow.document;
            if (frameDoc) {
              // Remove sandbox attributes from iframe
              frame.removeAttribute('sandbox');
            }
          } catch(e) {
            // Cross-origin, can't access
          }
        };

        // Handle error
        frame.onerror = function() {
          loader.classList.remove('show');
          errorMsg.classList.add('show');
          errorMsg.textContent = 'Failed to load: ' + url;
          statusMsg.textContent = '❌ Failed';
          statusMsg.className = 'status error';
        };

        // Timeout
        const timeoutId = setTimeout(function() {
          if (loader.classList.contains('show')) {
            loader.classList.remove('show');
            errorMsg.classList.add('show');
            errorMsg.textContent = 'Timeout loading: ' + url;
            statusMsg.textContent = '⏱️ Timeout';
            statusMsg.className = 'status error';
          }
        }, 30000);

        // Cleanup timeout on load
        const origOnload = frame.onload;
        frame.onload = function() {
          clearTimeout(timeoutId);
          if (origOnload) origOnload.call(this);
        };
      }

      loadBtn.addEventListener('click', function() {
        loadUrl(urlInput.value, 'proxy');
      });

      directBtn.addEventListener('click', function() {
        loadUrl(urlInput.value, 'direct');
      });

      // Enter key support
      urlInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') loadUrl(urlInput.value, 'proxy');
      });

      // Load default
      setTimeout(function() {
        loadUrl(urlInput.value, 'proxy');
      }, 300);
 
