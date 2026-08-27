import { NextDnsApi, ApiError } from './nextdns-api.js';
import { store } from './store.js';
import { el, reportError, toast } from './util.js';
import { tabsBar, spinner, confirmModal } from './components.js';
import { currentRoute, navigate, navigateBulk, onRouteChange } from './router.js';

const TABS = [
  { key: 'overview', label: 'סקירה כללית', icon: '🏠', mod: () => import('./views/overview.js') },
  { key: 'parental', label: 'בקרת הורים', icon: '👨‍👩‍👧', mod: () => import('./views/parental.js') },
  { key: 'lists', label: 'רשימות', icon: '📋', mod: () => import('./views/lists.js') },
  { key: 'security', label: 'אבטחה', icon: '🛡️', mod: () => import('./views/security.js') },
  { key: 'privacy', label: 'פרטיות', icon: '🕵️', mod: () => import('./views/privacy.js') },
  { key: 'devices', label: 'מכשירים', icon: '💻', mod: () => import('./views/devices.js') },
  { key: 'logs', label: 'יומן ופעילות', icon: '📊', mod: () => import('./views/logs.js') },
  { key: 'rewrites', label: 'שכתובים', icon: '🔀', mod: () => import('./views/rewrites.js') },
  { key: 'settings', label: 'הגדרות', icon: '⚙️', mod: () => import('./views/settings.js') },
];

const app = document.getElementById('app');
let api = null;
let profiles = [];

async function boot() {
  const key = store.getApiKey();
  if (!key) return renderGate();
  api = new NextDnsApi(key, store.getProxyUrl());
  try {
    profiles = await api.listProfiles();
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
      store.clearApiKey();
      return renderGate('מפתח ה-API אינו תקין יותר. נסו שוב.');
    }
    return renderGate(e.message || 'שגיאה בהתחברות ל-NextDNS');
  }
  renderShell();
}

function renderGate(errorMsg) {
  app.innerHTML = '';
  const input = el('input', { type: 'password', placeholder: 'מפתח ה-API שלכם', autocomplete: 'off' });
  const proxyInput = el('input', { type: 'text', placeholder: 'https://your-worker.your-name.workers.dev', style: 'direction:ltr;text-align:left', value: store.getProxyUrl() });
  const btn = el('button', { class: 'btn btn--full', onclick: () => connect() }, 'התחבר');
  const errBox = errorMsg ? el('p', { style: 'color:var(--red);font-size:13px;margin-top:-8px;margin-bottom:14px' }, errorMsg) : null;

  async function connect() {
    const val = input.value.trim();
    if (!val) { toast('נא להזין מפתח API', 'error'); return; }
    const proxyVal = proxyInput.value.trim();
    btn.disabled = true;
    btn.innerHTML = '';
    btn.appendChild(el('span', { class: 'spinner' }));
    try {
      const testApi = new NextDnsApi(val, proxyVal);
      profiles = await testApi.testConnection();
      store.setApiKey(val);
      store.setProxyUrl(proxyVal);
      api = testApi;
      renderShell();
    } catch (e) {
      reportError(e, 'לא ניתן להתחבר. ודאו שהמפתח נכון.');
      btn.disabled = false;
      btn.textContent = 'התחבר';
    }
  }
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') connect(); });

  app.appendChild(el('div', { class: 'gate' }, [
    el('div', { class: 'gate__card' }, [
      el('div', { class: 'gate__logo' }, '🛡️'),
      el('h1', {}, 'מנהל NextDNS'),
      el('p', {}, 'ניהול מלא של פרופילי NextDNS - בקרת הורים, לוחות זמנים, חסימת אתרים ומכשירים. הכל רץ בדפדפן שלכם בלבד, ללא שרת משלכם.'),
      errBox,
      el('div', { class: 'field' }, [
        el('label', {}, 'מפתח API'),
        input,
      ]),
      el('details', { class: 'gate__advanced', open: true }, [
        el('summary', {}, '⚙️ הגדרות התחברות מתקדמות (פרוקסי CORS)'),
        el('p', { style: 'font-size:12.5px;color:var(--text-dim);line-height:1.7;margin:8px 0' }, [
          'ל-NextDNS אין תמיכה בקריאות ישירות מהדפדפן ממקור חיצוני (CORS), כך שבדרך כלל תצטרכו כתובת של פרוקסי קטן וחינמי שמעביר את הבקשות הלאה בלי לשמור כלום. ההוראות המלאות (2 דקות, ללא צורך בכרטיס אשראי) נמצאות ב-README תחת "פרוקסי CORS חינמי". השאירו ריק כדי לנסות חיבור ישיר.',
        ]),
        el('div', { class: 'field' }, [
          el('label', {}, 'כתובת ה-Worker (אופציונלי)'),
          proxyInput,
        ]),
      ]),
      btn,
      el('div', { class: 'gate__note' }, [
        el('span', {}, '🔒'),
        el('span', {}, [
          'המפתח נשמר רק במכשיר שלכם (localStorage) ונשלח לפרוקסי (אם הוגדר) ולNextDNS בלבד - הפרוקסי שקוף ולא שומר דבר. ניתן למצוא את המפתח בתחתית ',
          el('a', { href: 'https://my.nextdns.io/account', target: '_blank', rel: 'noopener' }, 'עמוד החשבון שלכם'),
          '.',
        ]),
      ]),
    ]),
  ]));
  input.focus();
}

function renderShell() {
  app.innerHTML = '';
  const sidebar = el('div', { class: 'sidebar' });
  const backdrop = el('div', { class: 'sidebar-backdrop' });
  const main = el('div', { class: 'main' });

  const topbarTitle = el('span', { class: 'topbar__title' }, 'מנהל NextDNS');
  const closeDrawer = () => { sidebar.classList.remove('open'); backdrop.classList.remove('open'); };
  const openDrawer = () => { sidebar.classList.add('open'); backdrop.classList.add('open'); };
  backdrop.addEventListener('click', closeDrawer);
  const topbar = el('div', { class: 'topbar' }, [
    el('button', { class: 'topbar__menu-btn', onclick: openDrawer, 'aria-label': 'תפריט' }, '☰'),
    topbarTitle,
  ]);

  app.appendChild(el('div', { class: 'shell' }, [topbar, backdrop, sidebar, main]));

  buildSidebar(sidebar);

  onRouteChange((route) => { closeDrawer(); renderRoute(main, sidebar, route, topbarTitle); });
  let route = currentRoute();
  if (route.page === 'profile' && !route.profileId) {
    const last = store.getLastProfile();
    const fallback = profiles.find((p) => p.id === last) ? last : profiles[0]?.id;
    if (fallback) { navigate(fallback, 'overview'); return; }
  }
  renderRoute(main, sidebar, route, topbarTitle);
}

function buildSidebar(sidebar) {
  sidebar.innerHTML = '';
  sidebar.appendChild(el('div', { class: 'sidebar__brand' }, [el('span', { class: 'logo' }, '🛡️'), el('span', {}, 'מנהל NextDNS')]));

  sidebar.appendChild(el('div', { class: 'sidebar__section-title' }, 'הפרופילים שלי'));
  const listEl = el('div', {});
  const drawList = () => {
    listEl.innerHTML = '';
    profiles.forEach((p) => {
      const route = currentRoute();
      listEl.appendChild(el('div', {
        class: `profile-item ${route.page === 'profile' && route.profileId === p.id ? 'active' : ''}`,
        onclick: () => { store.setLastProfile(p.id); navigate(p.id, 'overview'); },
      }, [el('span', { class: 'profile-item__dot' }), el('span', {}, p.name || p.id)]));
    });
  };
  drawList();
  sidebar.appendChild(listEl);
  onRouteChange(drawList);

  const addBtn = el('button', { class: 'btn btn--ghost btn--sm', style: 'width:100%;margin-top:8px', onclick: async () => {
    const name = prompt('שם לפרופיל החדש:');
    if (!name) return;
    try {
      const created = await api.createProfile(name);
      const id = created?.id || created;
      profiles.push({ id, name });
      drawList();
      store.setLastProfile(id);
      navigate(id, 'overview');
      toast('הפרופיל נוצר', 'success');
    } catch (e) { reportError(e); }
  } }, '➕ פרופיל חדש');
  sidebar.appendChild(addBtn);

  const bulkBtn = el('button', {
    class: 'sidebar__link', style: 'margin-top:14px',
    onclick: () => navigateBulk(),
  }, [el('span', {}, '🔁'), el('span', {}, 'החלה על מספר פרופילים')]);
  sidebar.appendChild(bulkBtn);
  onRouteChange(() => {
    bulkBtn.classList.toggle('active', currentRoute().page === 'bulk');
  });

  sidebar.appendChild(el('div', { class: 'sidebar__footer' }, [
    el('button', { class: 'sidebar__link', onclick: toggleTheme }, [el('span', {}, '🌓'), el('span', {}, 'החלף מצב תצוגה')]),
    el('button', { class: 'sidebar__link', onclick: disconnect }, [el('span', {}, '🚪'), el('span', {}, 'התנתק')]),
  ]));
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : cur === 'light' ? '' : 'dark';
  if (next) document.documentElement.setAttribute('data-theme', next); else document.documentElement.removeAttribute('data-theme');
  store.setTheme(next || 'system');
}

async function disconnect() {
  const ok = await confirmModal({ title: 'התנתקות', body: 'המפתח יימחק מהמכשיר הזה. תוכלו להזין אותו שוב בכל עת.', confirmLabel: 'התנתק' });
  if (!ok) return;
  store.clearApiKey();
  location.reload();
}

async function renderRoute(main, sidebar, route, topbarTitle) {
  if (route.page === 'bulk') {
    if (topbarTitle) topbarTitle.textContent = 'החלת הגדרות';
    main.innerHTML = '';
    main.appendChild(el('div', { class: 'main__header' }, [
      el('div', {}, [
        el('h1', { class: 'main__title' }, 'החלת הגדרות על מספר פרופילים'),
        el('div', { class: 'main__subtitle' }, `${profiles.length} פרופילים זמינים`),
      ]),
    ]));
    const content = el('div', {});
    main.appendChild(content);
    content.appendChild(spinner());
    try {
      const mod = await import('./views/bulk.js');
      content.innerHTML = '';
      await mod.render(content, { api, profiles });
    } catch (e) {
      content.innerHTML = '';
      reportError(e);
    }
    return;
  }

  if (!route.profileId) { main.innerHTML = ''; main.appendChild(el('div', { class: 'empty-state' }, 'צור פרופיל כדי להתחיל')); return; }
  const profile = profiles.find((p) => p.id === route.profileId);
  const tabDef = TABS.find((t) => t.key === route.tab) || TABS[0];
  if (topbarTitle) topbarTitle.textContent = `${profile?.name || route.profileId} · ${tabDef.label}`;

  main.innerHTML = '';
  main.appendChild(el('div', { class: 'main__header' }, [
    el('div', {}, [
      el('h1', { class: 'main__title' }, profile?.name || route.profileId),
      el('div', { class: 'main__subtitle' }, tabDef.label),
    ]),
  ]));
  main.appendChild(tabsBar(TABS, tabDef.key, (key) => navigate(route.profileId, key)));

  const content = el('div', {});
  main.appendChild(content);
  content.appendChild(spinner());

  try {
    const mod = await tabDef.mod();
    content.innerHTML = '';
    await mod.render(content, {
      api,
      profileId: route.profileId,
      onProfileRenamed: (id, name) => {
        const p = profiles.find((x) => x.id === id);
        if (p) p.name = name;
        buildSidebar(sidebar);
        main.querySelector('.main__title').textContent = name || id;
        if (topbarTitle) topbarTitle.textContent = `${name || id} · ${tabDef.label}`;
      },
      onProfileDeleted: (id) => {
        profiles = profiles.filter((x) => x.id !== id);
        buildSidebar(sidebar);
        navigate(profiles[0]?.id || '', 'overview');
      },
    });
  } catch (e) {
    content.innerHTML = '';
    reportError(e);
  }
}

// --- אתחול ערכת נושא ---
(function initTheme() {
  const t = store.getTheme();
  if (t === 'dark' || t === 'light') document.documentElement.setAttribute('data-theme', t);
})();

boot();
