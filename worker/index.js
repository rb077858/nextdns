// פרוקסי CORS זעיר וחינמי ל-NextDNS API, שרץ על Cloudflare Workers.
//
// למה זה נחוץ: ל-api.nextdns.io אין תמיכה ב-CORS עבור בקשות שמגיעות ישירות
// מהדפדפן ממקור (origin) חיצוני כמו GitHub Pages. הדפדפן חוסם קריאות כאלה
// גם אם המפתח תקין. ה-Worker הזה רק מעביר את הבקשה הלאה ("שקוף") ומוסיף
// את כותרות ה-CORS החסרות - הוא לא שומר, לא מתעד ולא רואה שום דבר מעבר
// לזמן הריצה של הבקשה עצמה. זהו הרכיב היחיד באתר שדומה ל"שרת" - הוא לא
// מכיל שום לוגיקה עסקית, רק מעביר בקשות הלאה.
//
// פריסה: ראו README.md בתיקיית השורש של המאגר, תחת "פרוקסי CORS חינמי".

const NEXTDNS_API = 'https://api.nextdns.io';
const PREFIX = '/api/nextdns';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Api-Key',
  'Access-Control-Max-Age': '86400',
};

async function handleProxy(request, url) {
  const apiKey = request.headers.get('X-Api-Key');
  if (!apiKey) {
    return new Response(
      JSON.stringify({ errors: [{ code: 'authRequired', detail: 'חסר כותרת X-Api-Key' }] }),
      { status: 401, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
    );
  }

  const targetUrl = NEXTDNS_API + url.pathname.slice(PREFIX.length) + url.search;

  const init = {
    method: request.method,
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
  };
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const body = await request.text();
    if (body) init.body = body;
  }

  try {
    const upstream = await fetch(targetUrl, init);
    if (upstream.status === 204) {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    const text = await upstream.text();
    return new Response(text || null, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ errors: [{ code: 'proxyError', detail: String(err && err.message || err) }] }),
      { status: 502, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
    );
  }
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (url.pathname.startsWith(PREFIX + '/')) {
      return handleProxy(request, url);
    }

    return new Response('NextDNS CORS proxy is running. Use it at ' + PREFIX + '/...', {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', ...CORS_HEADERS },
    });
  },
};
