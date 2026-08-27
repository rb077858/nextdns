const listeners = new Set();

export function onRouteChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function currentRoute() {
  const hash = location.hash.replace(/^#\/?/, '');
  const parts = hash.split('/').filter(Boolean);
  // תמיכה בנתיב: p/:profileId/:tab
  if (parts[0] === 'p' && parts[1]) {
    return { profileId: decodeURIComponent(parts[1]), tab: parts[2] || 'overview' };
  }
  return { profileId: null, tab: null };
}

export function navigate(profileId, tab = 'overview') {
  location.hash = `#/p/${encodeURIComponent(profileId)}/${tab}`;
}

window.addEventListener('hashchange', () => {
  const r = currentRoute();
  listeners.forEach((fn) => fn(r));
});
