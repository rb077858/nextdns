const listeners = new Set();

export function onRouteChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function currentRoute() {
  const hash = location.hash.replace(/^#\/?/, '');
  const parts = hash.split('/').filter(Boolean);
  // תמיכה בנתיב: p/:profileId/:tab
  if (parts[0] === 'p' && parts[1]) {
    return { page: 'profile', profileId: decodeURIComponent(parts[1]), tab: parts[2] || 'overview' };
  }
  // תמיכה בנתיב: bulk (החלת הגדרות על כמה פרופילים)
  if (parts[0] === 'bulk') {
    return { page: 'bulk', profileId: null, tab: null };
  }
  return { page: 'profile', profileId: null, tab: null };
}

export function navigate(profileId, tab = 'overview') {
  location.hash = `#/p/${encodeURIComponent(profileId)}/${tab}`;
}

export function navigateBulk() {
  location.hash = '#/bulk';
}

window.addEventListener('hashchange', () => {
  const r = currentRoute();
  listeners.forEach((fn) => fn(r));
});
