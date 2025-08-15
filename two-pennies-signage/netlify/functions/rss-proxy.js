// Minimal serverless proxy to fetch BBC RSS and return JSON
export async function handler(event) {
  const url = new URL(event.rawUrl || `https://dummy/?${event.rawQueryString||''}`);
  const feedUrl = url.searchParams.get('url');
  if (!feedUrl) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing url param' }) };
  }
  try {
    const res = await fetch(feedUrl);
    const xml = await res.text();

    // Super-light XML parsing: pull out <item> blocks and grab <title>, <link>, <pubDate>
    const items = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/g)).map(m => {
      const block = m[1];
      const get = (tag) => {
        const mm = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
        return mm ? mm[1].replace(/<!\\[CDATA\\[(.*?)\\]\\]>/g, '$1').trim() : '';
      };
      return { title: get('title'), link: get('link'), pubDate: get('pubDate') };
    });

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json', 'cache-control': 'max-age=180' },
      body: JSON.stringify({ items })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: 'fetch_failed' }) };
  }
}
