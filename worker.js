// Cloudflare Worker to fetch video stream URL from peachify.top

export default {
  async fetch(request, env, ctx) {
    // Handle CORS
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
    
    // Extract URLs using regex
    const patterns = [
      /https?:\/\/[a-zA-Z0-9-]+\.workers\.dev\/mp4-proxy[^\s"'<>]*/g,
      /https?:\/\/[a-zA-Z0-9-]+\.workers\.dev\/[^\s"'<>]*/g,
      /https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/g,
      /https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/g,
      /https?:\/\/[^\s"'<>]+tripplestream\.online[^\s"'<>]*/g
    ];
    
    let allUrls = [];
    patterns.forEach(pattern => {
      const matches = html.match(pattern);
      if (matches) {
        allUrls = allUrls.concat(matches);
      }
    });
    
    // Also check script tags
    const scriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
    if (scriptMatches) {
      scriptMatches.forEach(script => {
        patterns.forEach(pattern => {
          const matches = script.match(pattern);
          if (matches) {
            allUrls = allUrls.concat(matches);
          }
        });
      });
    }
    
    // Remove duplicates
    const uniqueUrls = [...new Set(allUrls)];
    
    // Find proxy URL (prioritize mp4-proxy)
    let proxyUrl = uniqueUrls.find(url => url.includes('mp4-proxy'));
    if (!proxyUrl) {
      proxyUrl = uniqueUrls.find(url => url.includes('workers.dev'));
    }
    
    // Find m3u8 URL
    const m3u8Url = uniqueUrls.find(url => url.includes('.m3u8'));
    
    // Find mp4 URL
    const mp4Url = uniqueUrls.find(url => url.includes('.mp4'));
    
    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      target_url: TARGET_URL,
      proxy_url: proxyUrl || null,
      m3u8_url: m3u8Url || null,
      mp4_url: mp4Url || null,
      all_urls: uniqueUrls,
      total_found: uniqueUrls.length
    };
    
    // Store in KV if available
    if (typeof env !== 'undefined' && env.VIDEO_URLS) {
      await env.VIDEO_URLS.put('latest', JSON.stringify(result));
      await env.VIDEO_URLS.put('history_' + Date.now(), JSON.stringify(result));
    }
    
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
