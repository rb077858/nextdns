// שכבת אחסון מקומית - כל המידע נשאר בדפדפן של המשתמש בלבד (localStorage).
// לא נשלח לאף שרת מלבד NextDNS עצמו.

const KEY_API = 'nextdns_manager_api_key';
const KEY_THEME = 'nextdns_manager_theme';
const KEY_LAST_PROFILE = 'nextdns_manager_last_profile';
const KEY_LABELS_CACHE = 'nextdns_manager_labels_cache_v1';

export const store = {
  getApiKey() { return localStorage.getItem(KEY_API) || ''; },
  setApiKey(key) { localStorage.setItem(KEY_API, key.trim()); },
  clearApiKey() { localStorage.removeItem(KEY_API); },

  getTheme() { return localStorage.getItem(KEY_THEME) || 'system'; },
  setTheme(t) { localStorage.setItem(KEY_THEME, t); },

  getLastProfile() { return localStorage.getItem(KEY_LAST_PROFILE) || ''; },
  setLastProfile(id) { localStorage.setItem(KEY_LAST_PROFILE, id); },

  getLabelsCache() {
    try { return JSON.parse(localStorage.getItem(KEY_LABELS_CACHE)) || {}; }
    catch { return {}; }
  },
  setLabelsCache(obj) { localStorage.setItem(KEY_LABELS_CACHE, JSON.stringify(obj)); },
};
