// Cloudflare Worker - Advanced iFrame Proxy
// Avoids sandbox detection through multiple techniques

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');
  
  // If no URL provided, show the embedder page
  if (!targetUrl) {
    return new Response(getEmbedderPage(), {
      headers: { 'Content-Type': 'text/html' }
    });
  }

  // Validate and sanitize the target URL
  const sanitizedUrl = sanitizeUrl(targetUrl);
  if (!sanitizedUrl) {
    return new Response('Invalid URL', { status: 400 });
  }

  // Fetch the target content
  try {
    const response = await fetch(sanitizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
      }
    });

    // Clone response and modify content
    const contentType = response.headers.get('content-type') || '';
    const body = await response.text();

    // If HTML, inject our modifications
    if (contentType.includes('text/html')) {
      const modifiedBody = injectScripts(body, sanitizedUrl);
      return new Response(modifiedBody, {
        status: response.status,
        headers: {
          'Content-Type': 'text/html',
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'no-referrer',
          // Allow iframe embedding
          'Content-Security-Policy': "frame-ancestors 'self' *",
          'X-Frame-Options': 'ALLOWALL'
        }
      });
    }

    // Return other content as-is
    return new Response(body, {
      status: response.status,
      headers: response.headers
    });

  } catch (error) {
    return new Response('Error fetching URL: ' + error.message, { status: 500 });
  }
}

function sanitizeUrl(url) {
  try {
    const parsed = new URL(url);
    // Only allow http/https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function injectScripts(html, targetUrl) {
  // Escape the URL for JavaScript
  const escapedUrl = targetUrl.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  
  // Inject scripts to bypass sandbox detection
  const injection = `
  <script>
    (function() {
      // Override sandbox detection methods
      const originalCreateElement = document.createElement;
      document.createElement = function(tagName) {
        const element = originalCreateElement.call(this, tagName);
        if (tagName.toLowerCase() === 'iframe') {
          // Remove sandbox attribute
          element.removeAttribute('sandbox');
          // Bypass common detection
          Object.defineProperty(element, 'sandbox', {
            get: function() { return null; },
            set: function() { return null; }
          });
        }
        return element;
      };

      // Override iframe prototype
      const iframeProto = Object.getPrototypeOf(document.createElement('iframe'));
      Object.defineProperty(iframeProto, 'sandbox', {
        get: function() { return null; },
        set: function() { return null; }
      });

      // Bypass X-Frame-Options detection
      const originalFetch = window.fetch;
      window.fetch = function() {
        // Modify headers to bypass frame restrictions
        const args = Array.from(arguments);
        if (args[1] && args[1].headers) {
          args[1].headers['X-Frame-Options'] = 'ALLOWALL';
        }
        return originalFetch.apply(this, args);
      };

      // Remove common sandbox detection scripts
      const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          mutation.addedNodes.forEach(function(node) {
            if (node.nodeType === 1) {
              // Remove scripts that check for sandbox
              if (node.tagName === 'SCRIPT' && 
                  (node.src.includes('sandbox') || 
                   node.textContent.includes('sandbox'))) {
                node.remove();
              }
              // Remove X-Frame-Options meta tags
              if (node.tagName === 'META' && 
                  node.getAttribute('http-equiv') === 'X-Frame-Options') {
                node.remove();
              }
            }
          });
        });
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });

      // Override postMessage to prevent detection
      const originalPostMessage = window.postMessage;
      window.postMessage = function(message, targetOrigin, transfer) {
        if (typeof message === 'string' && 
            (message.includes('sandbox') || message.includes('frame'))) {
          return;
        }
        return originalPostMessage.call(this, message, targetOrigin, transfer);
      };

      console.log('Sandbox detection bypassed for:', '${escapedUrl}');
    })();
  </script>
  `;

  // Inject before </head> or at the beginning
  if (html.includes('</head>')) {
    return html.replace('</head>', injection + '</head>');
  } else {
    return injection + html;
  }
}

function getEmbedderPage() {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>Embedder - Load Any URL</title>
    <style>
      body {
        margin: 0;
        padding: 20px;
        font-family: Arial, sans-serif;
        background: #f0f0f0;
      }
      #container {
        max-width: 1200px;
        margin: 0 auto;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        padding: 20px;
      }
      #controls {
        margin-bottom: 20px;
        display: flex;
        gap: 10px;
      }
      #urlInput {
        flex: 1;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 16px;
      }
      #loadBtn, #iframeBtn {
        padding: 10px 20px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 16px;
      }
      #loadBtn:hover, #iframeBtn:hover {
        background: #0056b3;
      }
      #frameContainer {
        position: relative;
        width: 100%;
        height: 600px;
        border: 1px solid #ddd;
        border-radius: 4px;
        overflow: hidden;
        background: white;
      }
      #loader {
        display: none;
        text-align: center;
        padding: 20px;
        color: #666;
      }
      #directFrame {
        width: 100%;
        height: 100%;
        border: none;
        display: none;
      }
      .error {
        color: #dc3545;
        padding: 20px;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div id="container">
      <h2>URL Embedder - Bypass Sandbox Detection</h2>
      <div id="controls">
        <input type="text" id="urlInput" placeholder="Enter URL (e.g., https://example.com)" />
        <button id="loadBtn">Load via Proxy</button>
        <button id="iframeBtn">Direct Iframe</button>
      </div>
      <div id="frameContainer">
        <div id="loader">Loading...</div>
        <iframe id="directFrame" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>
      </div>
      <div style="margin-top: 10px; font-size: 12px; color: #666;">
        <strong>Note:</strong> This tool uses advanced techniques to bypass sandbox detection.
      </div>
    </div>

    <script>
      const urlInput = document.getElementById('urlInput');
      const loadBtn = document.getElementById('loadBtn');
      const iframeBtn = document.getElementById('iframeBtn');
      const directFrame = document.getElementById('directFrame');
      const loader = document.getElementById('loader');

      function loadUrl(url, mode) {
        if (!url) {
          alert('Please enter a URL');
          return;
        }

        try {
          new URL(url);
        } catch {
          alert('Invalid URL. Please include http:// or https://');
          return;
        }

        loader.style.display = 'block';
        directFrame.style.display = 'none';

        if (mode === 'proxy') {
          // Load via worker proxy
          const proxyUrl = '${window.location.origin}?url=' + encodeURIComponent(url);
          directFrame.src = proxyUrl;
        } else {
          // Direct iframe with bypass techniques
          directFrame.src = url;
        }

        directFrame.onload = function() {
          loader.style.display = 'none';
          directFrame.style.display = 'block';
          
          // Apply additional bypass techniques
          try {
            const frameDoc = directFrame.contentDocument || directFrame.contentWindow.document;
            if (frameDoc) {
              // Remove any sandbox restrictions
              directFrame.removeAttribute('sandbox');
              // Inject bypass scripts into the iframe
              const script = frameDoc.createElement('script');
              script.textContent = \`
                // Bypass X-Frame-Options
                if (window.top !== window.self) {
                  Object.defineProperty(window, 'top', {
                    get: function() { return window.self; }
                  });
                  Object.defineProperty(window, 'parent', {
                    get: function() { return window.self; }
                  });
                }
                // Override location
                const originalLocation = window.location;
                Object.defineProperty(window, 'location', {
                  get: function() { return originalLocation; },
                  set: function() { return; }
                });
              \`;
              frameDoc.head.appendChild(script);
            }
          } catch(e) {
            // Cross-origin iframe, cannot modify
            console.log('Cross-origin iframe, bypass attempted');
          }
        };

        directFrame.onerror = function() {
          loader.style.display = 'none';
          directFrame.style.display = 'block';
          console.log('Frame loaded with potential restrictions');
        };
      }

      loadBtn.addEventListener('click', function() {
        loadUrl(urlInput.value, 'proxy');
      });

      iframeBtn.addEventListener('click', function() {
        loadUrl(urlInput.value, 'direct');
      });

      // Load example on page load
      setTimeout(() => {
        urlInput.value = 'https://example.com';
      }, 100);
    </script>
  </body>
  </html>
  `;
}
