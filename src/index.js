// src/index.js - Fixed version with error handling
export default {
  async fetch(request) {
    try {
      const url = new URL(request.url);
      const targetUrl = url.searchParams.get('url');
      
      // If no URL provided, show the embedder page
      if (!targetUrl) {
        return new Response(getEmbedderPage(), {
          headers: { 'Content-Type': 'text/html' }
        });
      }

      // Validate URL
      const sanitizedUrl = sanitizeUrl(targetUrl);
      if (!sanitizedUrl) {
        return new Response('Invalid URL. Please use http:// or https://', { 
          status: 400,
          headers: { 'Content-Type': 'text/plain' }
        });
      }

      // Fetch the target URL
      const response = await fetch(sanitizedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache'
        }
      });

      const contentType = response.headers.get('content-type') || '';
      let body = await response.text();

      // If HTML, inject bypass scripts
      if (contentType.includes('text/html')) {
        body = injectBypassScripts(body, sanitizedUrl);
        
        return new Response(body, {
          status: response.status,
          headers: {
            'Content-Type': 'text/html',
            'X-Content-Type-Options': 'nosniff',
            'Referrer-Policy': 'no-referrer',
            'X-Frame-Options': 'ALLOWALL',
            'Content-Security-Policy': "frame-ancestors 'self' *"
          }
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

function injectBypassScripts(html, targetUrl) {
  const script = `
  <script>
    // Bypass sandbox detection
    (function() {
      try {
        // Override createElement for iframes
        const origCreateElement = document.createElement;
        document.createElement = function(tag) {
          const el = origCreateElement.call(this, tag);
          if (tag && tag.toLowerCase() === 'iframe') {
            el.removeAttribute('sandbox');
            Object.defineProperty(el, 'sandbox', {
              get: function() { return null; },
              set: function() {}
            });
          }
          return el;
        };

        // Override iframe prototype
        try {
          const iframeProto = Object.getPrototypeOf(document.createElement('iframe'));
          Object.defineProperty(iframeProto, 'sandbox', {
            get: function() { return null; },
            set: function() {}
          });
        } catch(e) {}

        // Remove X-Frame-Options meta tags
        try {
          const metas = document.querySelectorAll('meta[http-equiv="X-Frame-Options"]');
          metas.forEach(function(m) { m.remove(); });
        } catch(e) {}

        console.log('Sandbox bypass active for: ${targetUrl}');
      } catch(e) {
        console.log('Bypass script error:', e);
      }
    })();
  </script>
  `;

  // Inject script safely
  try {
    if (html && html.includes('</head>')) {
      return html.replace('</head>', script + '</head>');
    } else if (html && html.includes('<body>')) {
      return html.replace('<body>', '<body>' + script);
    } else {
      return script + (html || '');
    }
  } catch(e) {
    return html || '';
  }
}

function getEmbedderPage() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>URL Embedder</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #f0f2f5; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header h1 { color: #1a73e8; margin-bottom: 10px; }
    .controls { display: flex; gap: 10px; flex-wrap: wrap; }
    .controls input { flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 16px; min-width: 200px; }
    .controls button { padding: 12px 24px; background: #1a73e8; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
    .controls button:hover { background: #1557b0; }
    .controls button:active { transform: scale(0.98); }
    .frame-wrapper { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-top: 20px; }
    .frame-wrapper iframe { width: 100%; height: 600px; border: none; display: block; }
    .loader { display: none; text-align: center; padding: 40px; color: #666; }
    .loader.show { display: block; }
    .info { margin-top: 10px; color: #666; font-size: 12px; padding: 10px; background: #fff; border-radius: 4px; }
    .error { color: #dc3545; padding: 20px; text-align: center; display: none; }
    .error.show { display: block; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 URL Embedder</h1>
      <div class="controls">
        <input type="text" id="urlInput" placeholder="Enter URL (e.g., https://example.com)" value="https://example.com">
        <button id="loadBtn">Load URL</button>
        <button id="directBtn">Direct Iframe</button>
      </div>
    </div>
    <div class="frame-wrapper">
      <div id="loader" class="loader">Loading...</div>
      <div id="error" class="error">Failed to load URL</div>
      <iframe id="frame" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>
    </div>
    <div class="info">⚠️ Some sites may still block embedding. This tool attempts to bypass common restrictions.</div>
  </div>
  <script>
    (function() {
      const urlInput = document.getElementById('urlInput');
      const loadBtn = document.getElementById('loadBtn');
      const directBtn = document.getElementById('directBtn');
      const frame = document.getElementById('frame');
      const loader = document.getElementById('loader');
      const error = document.getElementById('error');

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

        // Show loader, hide error
        loader.classList.add('show');
        error.classList.remove('show');
        frame.style.display = 'none';

        // Set iframe src based on mode
        if (mode === 'proxy') {
          frame.src = window.location.origin + '?url=' + encodeURIComponent(url);
        } else {
          frame.src = url;
        }

        // Handle load success
        frame.onload = function() {
          loader.classList.remove('show');
          frame.style.display = 'block';
          error.classList.remove('show');
        };

        // Handle load error
        frame.onerror = function() {
          loader.classList.remove('show');
          error.classList.add('show');
          error.textContent = 'Failed to load: ' + url;
        };

        // Timeout for loading
        setTimeout(function() {
          if (loader.classList.contains('show')) {
            loader.classList.remove('show');
            error.classList.add('show');
            error.textContent = 'Timeout loading: ' + url;
          }
        }, 30000);
      }

      loadBtn.addEventListener('click', function() {
        loadUrl(urlInput.value, 'proxy');
      });

      directBtn.addEventListener('click', function() {
        loadUrl(urlInput.value, 'direct');
      });

      // Load default URL on page load
      setTimeout(function() {
        loadUrl(urlInput.value, 'proxy');
      }, 500);
    })();
  </script>
</body>
</html>`;
}
