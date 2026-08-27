export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v === false || v === null || v === undefined) continue;
    else if (v === true) node.setAttribute(k, '');
    else node.setAttribute(k, v);
  }
  const kids = Array.isArray(children) ? children : [children];
  for (const c of kids) {
    if (c === null || c === undefined || c === false) continue;
    node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(c) : c);
  }
  return node;
}

export function debounce(fn, wait = 500) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

export function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

// --- התראות (Toasts) ---
let toastRoot = null;
export function toast(message, type = 'info', timeout = 3800) {
  if (!toastRoot) {
    toastRoot = document.getElementById('toast-root');
  }
  if (!toastRoot) return;
  const node = el('div', { class: `toast toast--${type}` }, [
    el('span', { class: 'toast__icon' }, type === 'error' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️'),
    el('span', { class: 'toast__msg' }, message),
  ]);
  toastRoot.appendChild(node);
  requestAnimationFrame(() => node.classList.add('toast--in'));
  setTimeout(() => {
    node.classList.remove('toast--in');
    node.addEventListener('transitionend', () => node.remove(), { once: true });
    setTimeout(() => node.remove(), 500);
  }, timeout);
}

export function reportError(err, fallback = 'משהו השתבש') {
  console.error(err);
  const msg = err && err.message ? err.message : fallback;
  toast(msg, 'error');
}

// --- ימי שבוע (עברית, ראשון-שבת) ---
export const WEEKDAYS = [
  { key: 'sunday', label: 'ראשון' },
  { key: 'monday', label: 'שני' },
  { key: 'tuesday', label: 'שלישי' },
  { key: 'wednesday', label: 'רביעי' },
  { key: 'thursday', label: 'חמישי' },
  { key: 'friday', label: 'שישי' },
  { key: 'saturday', label: 'שבת' },
];

export function timeAgo(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'עכשיו';
  if (diff < 3600) return `לפני ${Math.floor(diff / 60)} דק׳`;
  if (diff < 86400) return `לפני ${Math.floor(diff / 3600)} שע׳`;
  return `לפני ${Math.floor(diff / 86400)} ימים`;
}

export function copyToClipboard(text) {
  navigator.clipboard?.writeText(text).then(
    () => toast('הועתק ללוח', 'success'),
    () => toast('העתקה נכשלה', 'error'),
  );
}

// רשימת TLDs נפוצים - לשימוש ב"מצב הרשאה בלבד" (חסימת הכל חוץ ממה שהותר).
// זהו קירוב בלבד ולא מנגנון רשמי של NextDNS - ראו הסבר במסך הרשימות.
export const COMMON_TLDS = [
  'com', 'net', 'org', 'io', 'co', 'info', 'biz', 'xyz', 'online', 'site',
  'shop', 'store', 'tv', 'me', 'app', 'dev', 'ai', 'us', 'uk', 'ca',
  'de', 'fr', 'nl', 'ru', 'cn', 'top', 'club', 'live', 'world', 'icu',
  'vip', 'one', 'pw', 'cc', 'tk', 'ml', 'ga', 'cf', 'gq', 'win', 'link',
  'fun', 'pro', 'life', 'today', 'news', 'tech', 'space', 'website', 'video',
];
