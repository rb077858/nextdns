// עטיפה קלה מעל NextDNS API. כל הבקשות יוצאות ישירות מהדפדפן אל api.nextdns.io.
// אין שרת ביניים - מפתח ה-API נשמר רק ב-localStorage של המשתמש.

const BASE_URL = 'https://api.nextdns.io';

export class ApiError extends Error {
  constructor(status, message, body) {
    super(message || `שגיאת שרת (${status})`);
    this.status = status;
    this.body = body;
  }
}

export class NextDnsApi {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async request(method, path, body) {
    if (!this.apiKey) throw new ApiError(401, 'לא הוגדר מפתח API');
    let res;
    try {
      res = await fetch(BASE_URL + path, {
        method,
        headers: {
          'X-Api-Key': this.apiKey,
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      throw new ApiError(0, 'לא ניתן להתחבר ל-NextDNS. בדוק חיבור אינטרנט.', null);
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
