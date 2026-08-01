// Cloudflare Worker to fetch the binary video URL from peachify.top

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'extract';

    if (action === 'extract') {
      return await extractVideoUrl();
    } else if (action === 'status') {
      return await getStatus();
    } else {
      return new Response(JSON.stringify({
        error: 'Invalid action. Use ?action=extract or ?action=status'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }
  }
};

async function extractVideoUrl() {
  const TARGET_URL = "https://peachify.top/embed/movie/1081003?accent=7c5cff&dub=Hindi&quality=1080";
  
  try {
    console.log(`🎯 Extracting from: ${TARGET_URL}`);
    
    // Fetch the page
    const response = await fetch(TARGET_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
        'Referer': 'https://peachify.top/',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    const html = await response.text();
    
    // Look specifically for the binary URL pattern
    // The URL format: https://*.workers.dev/mp4-proxy?uri=http...
    const binaryPatterns = [
      // Match mp4-proxy URLs with full query parameters
      /https?:\/\/[a-zA-Z0-9-]+\.workers\.dev\/mp4-proxy\?[^\s"'<>]*/g,
      // Match any workers.dev URL with bin or mp4-proxy
      /https?:\/\/[a-zA-Z0-9-]+\.workers\.dev\/[^\s"'<>]*/g,
      // Match URLs with uri= parameter
      /https?:\/\/[^\s"'<>]+\?uri=[^\s"'<>]*/g,
      // Match tripplestream URLs
      /https?:\/\/[^\s"'<>]+tripplestream\.online[^\s"'<>]*/g,
    ];
    
    let allUrls = [];
    binaryPatterns.forEach(pattern => {
      const matches = html.match(pattern);
      if (matches) {
        allUrls = allUrls.concat(matches);
      }
    });
    
    // Also check script tags for encoded URLs
    const scriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
    if (scriptMatches) {
      scriptMatches.forEach(script => {
        binaryPatterns.forEach(pattern => {
          const matches = script.match(pattern);
          if (matches) {
            allUrls = allUrls.concat(matches);
          }
        });
        
        // Also look for URL encoded in JavaScript variables
        const jsUrlMatches = script.match(/["'](https?:\/\/[^"']*workers\.dev[^"']*)["']/g);
        if (jsUrlMatches) {
          jsUrlMatches.forEach(match => {
            const url = match.replace(/["']/g, '');
            allUrls.push(url);
          });
        }
      });
    }
    
    // Remove duplicates
    const uniqueUrls = [...new Set(allUrls)];
    
    // Filter specifically for mp4-proxy with uri parameter (the binary URL)
    const binaryUrl = uniqueUrls.find(url => 
      url.includes('mp4-proxy') && url.includes('uri=')
    );
    
    // If no binary URL found, try to find any workers.dev URL
    const fallbackUrl = uniqueUrls.find(url => 
      url.includes('workers.dev') && url.includes('?')
    );
    
    // Find m3u8 URL
    const m3u8Url = uniqueUrls.find(url => url.includes('.m3u8'));
    
    // Find mp4 URL
    const mp4Url = uniqueUrls.find(url => url.includes('.mp4'));
    
    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      target_url: TARGET_URL,
      // The binary URL is the one you want
      binary_url: binaryUrl || fallbackUrl || null,
      m3u8_url: m3u8Url || null,
      mp4_url: mp4Url || null,
      all_urls: uniqueUrls,
      total_found: uniqueUrls.length,
      // Extract the actual video URL from the uri parameter if present
      extracted_video_url: binaryUrl ? extractUriParam(binaryUrl) : null
    };
    
    return new Response(JSON.stringify(result, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
}

// Helper function to extract the video URL from the uri parameter
function extractUriParam(url) {
  try {
    const urlObj = new URL(url);
    const uri = urlObj.searchParams.get('uri');
    if (uri) {
      return decodeURIComponent(uri);
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function getStatus() {
  return new Response(JSON.stringify({
    status: 'online',
    timestamp: new Date().toISOString(),
    endpoints: {
      extract: '/?action=extract',
      status: '/?action=status'
    }
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    }
  });
}
