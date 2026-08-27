// עטיפה קלה מעל NextDNS API.
//
// חשוב: ל-NextDNS אין תמיכה ב-CORS עבור קריאות ישירות מהדפדפן ממקור (origin) חיצוני
// כמו GitHub Pages - קריאה ישירה ל-api.nextdns.io תיחסם על ידי הדפדפן. לכן, אלא אם
// הוגדר proxyUrl (ראו מסך ההתחברות > "הגדרות התחברות מתקדמות"), הבקשות עלולות להיכשל.
// ה-proxy הוא פונקציית Cloudflare Worker קטנה וחינמית שמעבירה את הבקשה הלאה בלי
// לשמור/לתעד את מפתח ה-API - ראו את תיקיית worker/ ואת ה-README להוראות פריסה.
// המפתח עצמו תמיד נשמר רק ב-localStorage של הדפדפן שלכם.

const DIRECT_BASE_URL = 'https://api.nextdns.io';

export class ApiError extends Error {
  constructor(status, message, body) {
    super(message || `שגיאת שרת (${status})`);
    this.status = status;
    this.body = body;
  }
}

export class NextDnsApi {
  constructor(apiKey, proxyUrl) {
    this.apiKey = apiKey;
    this.proxyUrl = (proxyUrl || '').trim().replace(/\/$/, '');
  }

  get baseUrl() {
    return this.proxyUrl ? `${this.proxyUrl}/api/nextdns` : DIRECT_BASE_URL;
  }

  async request(method, path, body) {
    if (!this.apiKey) throw new ApiError(401, 'לא הוגדר מפתח API');
    let res;
    try {
      res = await fetch(this.baseUrl + path, {
        method,
        headers: {
          'X-Api-Key': this.apiKey,
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      const msg = this.proxyUrl
        ? 'לא ניתן להתחבר לפרוקסי שהוגדר. ודאו שכתובת ה-Worker נכונה ושהוא פעיל (ראו "הגדרות התחברות מתקדמות").'
        : 'לא ניתן להתחבר ישירות ל-NextDNS מהדפדפן - כנראה בגלל חסימת CORS מצידם. יש להגדיר פרוקסי חינמי דרך "הגדרות התחברות מתקדמות" במסך ההתחברות (ראו הוראות ב-README).';
      throw new ApiError(0, msg, null);
    }

    if (res.status === 204) return null;

    const text = await res.text();
    let json = null;
    if (text) {
      try { json = JSON.parse(text); } catch { json = text; }
    }

    if (!res.ok) {
      const msg = (json && json.errors && json.errors[0] && (json.errors[0].detail || json.errors[0].code))
        || (typeof json === 'string' ? json : null)
        || `שגיאה ${res.status}`;
      throw new ApiError(res.status, msg, json);
    }

    return json && typeof json === 'object' && 'data' in json ? json.data : json;
  }

  get(path) { return this.request('GET', path); }
  post(path, body) { return this.request('POST', path, body); }
  patch(path, body) { return this.request('PATCH', path, body); }
  del(path) { return this.request('DELETE', path); }

  // --- בדיקת חיבור ---
  async testConnection() {
    return this.listProfiles();
  }

  // --- פרופילים ---
  listProfiles() { return this.get('/profiles'); }
  getProfile(id) { return this.get(`/profiles/${id}`); }
  createProfile(name) { return this.post('/profiles', { name }); }
  renameProfile(id, name) { return this.patch(`/profiles/${id}`, { name }); }
  deleteProfile(id) { return this.del(`/profiles/${id}`); }

  // --- אבטחה ---
  getSecurity(id) { return this.get(`/profiles/${id}/security`); }
  patchSecurity(id, body) { return this.patch(`/profiles/${id}/security`, body); }

  // --- פרטיות ---
  getPrivacy(id) { return this.get(`/profiles/${id}/privacy`); }
  patchPrivacy(id, body) { return this.patch(`/profiles/${id}/privacy`, body); }

  // --- בקרת הורים ---
  getParentalControl(id) { return this.get(`/profiles/${id}/parentalControl`); }
  patchParentalControl(id, body) { return this.patch(`/profiles/${id}/parentalControl`, body); }

  // --- רשימות חסימה/הרשאה ---
  getDenylist(id) { return this.get(`/profiles/${id}/denylist`); }
  addDenylist(id, domain, active = true) { return this.post(`/profiles/${id}/denylist`, { id: domain, active }); }
  setDenylistActive(id, domain, active) { return this.patch(`/profiles/${id}/denylist/${encodeURIComponent(domain)}`, { active }); }
  removeDenylist(id, domain) { return this.del(`/profiles/${id}/denylist/${encodeURIComponent(domain)}`); }

  getAllowlist(id) { return this.get(`/profiles/${id}/allowlist`); }
  addAllowlist(id, domain, active = true) { return this.post(`/profiles/${id}/allowlist`, { id: domain, active }); }
  setAllowlistActive(id, domain, active) { return this.patch(`/profiles/${id}/allowlist/${encodeURIComponent(domain)}`, { active }); }
  removeAllowlist(id, domain) { return this.del(`/profiles/${id}/allowlist/${encodeURIComponent(domain)}`); }

  // --- שכתובים (DNS Rewrites) ---
  getRewrites(id) { return this.get(`/profiles/${id}/rewrites`); }
  addRewrite(id, name, content) { return this.post(`/profiles/${id}/rewrites`, { name, content }); }
  removeRewrite(id, rewriteId) { return this.del(`/profiles/${id}/rewrites/${rewriteId}`); }

  // --- הגדרות ---
  getSettings(id) { return this.get(`/profiles/${id}/settings`); }
  patchSettings(id, body) { return this.patch(`/profiles/${id}/settings`, body); }

  // --- הגדרות חיבור (Setup) ---
  getSetup(id) { return this.get(`/profiles/${id}/setup`); }
  getLinkedIp(id) { return this.get(`/profiles/${id}/setup/linkedIp`); }
  refreshLinkedIp(id) { return this.patch(`/profiles/${id}/setup/linkedIp`, {}); }

  // --- אנליטיקס ---
  getAnalyticsDevices(id) { return this.get(`/profiles/${id}/analytics/devices`); }
  getAnalyticsDomains(id) { return this.get(`/profiles/${id}/analytics/domains?limit=25`); }
  getAnalyticsStatus(id) { return this.get(`/profiles/${id}/analytics/status`); }
  getAnalyticsReasons(id) { return this.get(`/profiles/${id}/analytics/reasons?limit=25`); }

  // --- יומן שאילתות ---
  getLogs(id, params = '') { return this.get(`/profiles/${id}/logs${params}`); }
  clearLogs(id) { return this.del(`/profiles/${id}/logs`); }
}
