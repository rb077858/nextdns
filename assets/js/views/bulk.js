import { el, reportError, toast } from '../util.js';
import { card, spinner, confirmModal } from '../components.js';
import { FIELDS as SECURITY_FIELDS } from './security.js';
import { categoryLabel, serviceLabel, CATEGORY_LABELS, SERVICE_LABELS } from '../labels.js';

const COPY_CATEGORIES = [
  { key: 'security', label: '🛡️ אבטחה', desc: 'כל הגדרות ה-Security, כולל חסימת TLD' },
  { key: 'privacy', label: '🕵️ פרטיות', desc: 'חסימת מעקב יצרנים, רשימות חסימה, ועוד' },
  { key: 'parental', label: '👨‍👩‍👧 בקרת הורים', desc: 'קטגוריות, אפליקציות, SafeSearch ולוח הזמנים' },
  { key: 'denylist', label: '⛔ רשימת חסימה', desc: 'הוספת הדומיינים החסומים (לא מוחק דומיינים קיימים ביעד)' },
  { key: 'allowlist', label: '✅ רשימת הרשאה', desc: 'הוספת הדומיינים המותרים (לא מוחק דומיינים קיימים ביעד)' },
  { key: 'rewrites', label: '🔀 שכתובים', desc: 'הוספת שכתובי DNS (לא מוחק שכתובים קיימים ביעד)' },
  { key: 'settings', label: '⚙️ הגדרות', desc: 'יומן, דף חסימה וביצועים' },
];

const TOGGLE_FIELDS = [
  ...SECURITY_FIELDS.map((f) => ({ resource: 'security', key: f.key, title: `🛡️ ${f.title}` })),
  { resource: 'privacy', key: 'disguisedTrackers', title: '🕵️ חסימת עוקבים מוסווים' },
  { resource: 'privacy', key: 'allowAffiliate', title: '🕵️ אפשר קישורי שותפים' },
  { resource: 'parental', key: 'safeSearch', title: '👨‍👩‍👧 חיפוש בטוח (SafeSearch)' },
  { resource: 'parental', key: 'youtubeRestrictedMode', title: '👨‍👩‍👧 מצב מוגבל ב-YouTube' },
  { resource: 'parental', key: 'blockBypass', title: '👨‍👩‍👧 חסימת עקיפת בקרת הורים' },
];

function sanitizeIdActive(arr) {
  return (arr || []).map((x) => ({ id: x.id, active: x.active, recreation: x.recreation }));
}

// ---------- מצב א׳: העתקת הגדרות מפרופיל מקור ----------

async function applyCategory(api, key, sourceData, targetId, log) {
  if (key === 'security') {
    await api.patchSecurity(targetId, {
      ...Object.fromEntries(Object.entries(sourceData).filter(([k]) => k !== 'tlds')),
      tlds: (sourceData.tlds || []).map((t) => ({ id: t.id })),
    });
    return;
  }
  if (key === 'privacy') {
    await api.patchPrivacy(targetId, {
      disguisedTrackers: sourceData.disguisedTrackers,
      allowAffiliate: sourceData.allowAffiliate,
      natives: sanitizeIdActive(sourceData.natives),
      blocklists: (sourceData.blocklists || []).map((b) => ({ id: b.id })),
    });
    return;
  }
  if (key === 'parental') {
    await api.patchParentalControl(targetId, {
      safeSearch: sourceData.safeSearch,
      youtubeRestrictedMode: sourceData.youtubeRestrictedMode,
      blockBypass: sourceData.blockBypass,
      categories: sanitizeIdActive(sourceData.categories),
      services: sanitizeIdActive(sourceData.services),
    });
    if (sourceData.recreation) {
      try {
        await api.patchParentalControl(targetId, { recreation: sourceData.recreation });
      } catch (e) {
        log(`⚠️ לוח הזמנים לא הועתק (ידוע כלא יציב ב-API): ${e.message}`);
      }
    }
    return;
  }
  if (key === 'settings') {
    await api.patchSettings(targetId, {
      logs: sourceData.logs,
      blockPage: sourceData.blockPage,
      performance: sourceData.performance,
      web3: sourceData.web3,
    });
    return;
  }
  if (key === 'denylist' || key === 'allowlist') {
    const getExisting = key === 'denylist' ? api.getDenylist.bind(api) : api.getAllowlist.bind(api);
    const add = key === 'denylist' ? api.addDenylist.bind(api) : api.addAllowlist.bind(api);
    const existing = await getExisting(targetId);
    const existingIds = new Set((existing || []).map((x) => x.id));
    let added = 0;
    for (const item of sourceData || []) {
      if (existingIds.has(item.id)) continue;
      await add(targetId, item.id, item.active !== false);
      added++;
    }
    log(`נוספו ${added} דומיינים חדשים`);
    return;
  }
  if (key === 'rewrites') {
    const existing = await api.getRewrites(targetId);
    const existingKeys = new Set((existing || []).map((x) => `${x.name}=>${x.content}`));
    let added = 0;
    for (const item of sourceData || []) {
      const k = `${item.name}=>${item.content}`;
      if (existingKeys.has(k)) continue;
      await api.addRewrite(targetId, item.name, item.content);
      added++;
    }
    log(`נוספו ${added} שכתובים חדשים`);
  }
}

async function fetchSourceData(api, key, sourceId) {
  if (key === 'security') return api.getSecurity(sourceId);
  if (key === 'privacy') return api.getPrivacy(sourceId);
  if (key === 'parental') return api.getParentalControl(sourceId);
  if (key === 'settings') return api.getSettings(sourceId);
  if (key === 'denylist') return api.getDenylist(sourceId);
  if (key === 'allowlist') return api.getAllowlist(sourceId);
  if (key === 'rewrites') return api.getRewrites(sourceId);
}

// ---------- מצב ב׳: פעולה ישירה על כמה פרופילים ----------

async function toggleCategoryOrService(api, targetId, entryId, active) {
  const isCategory = entryId in CATEGORY_LABELS;
  const pc = await api.getParentalControl(targetId);
  const listKey = isCategory ? 'categories' : 'services';
  const list = pc[listKey] || [];
  const idx = list.findIndex((x) => x.id === entryId);
  const next = idx >= 0
    ? list.map((x, i) => (i === idx ? { ...x, active } : x))
    : [...list, { id: entryId, active, recreation: false }];
  await api.patchParentalControl(targetId, { [listKey]: sanitizeIdActive(next) });
}

async function applyDirectAction(api, action, targetId) {
  if (action.group === 'domain') {
    const domain = action.domain;
    if (action.type === 'allow-add') return api.addAllowlist(targetId, domain, true);
    if (action.type === 'deny-add') return api.addDenylist(targetId, domain, true);
    if (action.type === 'allow-remove') return api.removeAllowlist(targetId, domain);
    if (action.type === 'deny-remove') return api.removeDenylist(targetId, domain);
  }
  if (action.group === 'catsvc') {
    return toggleCategoryOrService(api, targetId, action.entryId, action.active);
  }
  if (action.group === 'toggle') {
    const f = TOGGLE_FIELDS[action.fieldIndex];
    if (f.resource === 'security') return api.patchSecurity(targetId, { [f.key]: action.active });
    if (f.resource === 'privacy') return api.patchPrivacy(targetId, { [f.key]: action.active });
    if (f.resource === 'parental') return api.patchParentalControl(targetId, { [f.key]: action.active });
  }
}

// ---------- רכיבי UI משותפים ----------

function profileChecklist(profiles, excludeId) {
  const checks = {};
  const wrap = el('div', {});
  profiles.filter((p) => p.id !== excludeId).forEach((p) => {
    const cb = el('input', { type: 'checkbox' });
    checks[p.id] = cb;
    wrap.appendChild(el('div', { class: 'setting-row' }, [
      el('div', { class: 'setting-row__text' }, [el('strong', {}, p.name || p.id)]),
      el('label', { class: 'switch' }, [cb, el('span', { class: 'switch__track' })]),
    ]));
  });
  const selectAllBtn = el('button', { class: 'btn btn--ghost btn--sm', onclick: () => Object.values(checks).forEach((c) => { c.checked = true; }) }, 'סמן הכל');
  const clearAllBtn = el('button', { class: 'btn btn--ghost btn--sm', onclick: () => Object.values(checks).forEach((c) => { c.checked = false; }) }, 'נקה בחירה');
  return { checks, node: el('div', {}, [el('div', { style: 'display:flex;gap:8px;margin-bottom:10px' }, [selectAllBtn, clearAllBtn]), wrap]) };
}

function resultsLine(name) {
  return el('div', { class: 'list-row' }, [el('span', {}, `⏳ ${name}`)]);
}
function setResultLine(line, name, ok, messages) {
  line.innerHTML = '';
  line.appendChild(el('span', {}, `${ok ? '✅' : '⚠️'} ${name}`));
  if (messages.length) line.appendChild(el('span', { style: 'font-size:12px;color:var(--text-dim)' }, messages.join(' · ')));
}

// ---------- מצב א׳ - View ----------

function renderCopyMode(container, api, profiles) {
  const sourceSelect = el('select', {});
  profiles.forEach((p) => sourceSelect.appendChild(el('option', { value: p.id }, p.name || p.id)));

  const catChecks = {};
  const catList = el('div', {});
  COPY_CATEGORIES.forEach((c) => {
    const cb = el('input', { type: 'checkbox' });
    catChecks[c.key] = cb;
    catList.appendChild(el('div', { class: 'setting-row' }, [
      el('div', { class: 'setting-row__text' }, [el('strong', {}, c.label), el('span', {}, c.desc)]),
      el('label', { class: 'switch' }, [cb, el('span', { class: 'switch__track' })]),
    ]));
  });

  const targetsHolder = el('div', {});
  let targets = profileChecklist(profiles, sourceSelect.value);
  targetsHolder.appendChild(targets.node);
  sourceSelect.addEventListener('change', () => {
    targets = profileChecklist(profiles, sourceSelect.value);
    targetsHolder.innerHTML = '';
    targetsHolder.appendChild(targets.node);
  });

  const resultsBox = el('div', { style: 'margin-top:14px' });

  const applyBtn = el('button', { class: 'btn btn--full', onclick: async () => {
    const selectedCats = COPY_CATEGORIES.filter((c) => catChecks[c.key].checked).map((c) => c.key);
    const selectedTargets = profiles.filter((p) => targets.checks[p.id]?.checked);
    if (!selectedCats.length) { toast('בחרו לפחות קטגוריית הגדרות אחת', 'error'); return; }
    if (!selectedTargets.length) { toast('בחרו לפחות פרופיל יעד אחד', 'error'); return; }

    const sourceProfile = profiles.find((p) => p.id === sourceSelect.value);
    const ok = await confirmModal({
      title: 'החלת הגדרות',
      body: `להחיל ${selectedCats.length} קטגוריות הגדרות מ-<b>${sourceProfile?.name || sourceSelect.value}</b> על ${selectedTargets.length} פרופילים? הגדרות קיימות בפרופילי היעד (מהקטגוריות שנבחרו) יוחלפו.`,
      confirmLabel: 'החל הגדרות',
      danger: true,
    });
    if (!ok) return;

    applyBtn.disabled = true;
    resultsBox.innerHTML = '';
    const sourceCache = {};
    for (const key of selectedCats) {
      try { sourceCache[key] = await fetchSourceData(api, key, sourceSelect.value); }
      catch (e) { reportError(e, `נכשלה טעינת ${key} מהפרופיל המקור`); applyBtn.disabled = false; return; }
    }

    for (const target of selectedTargets) {
      const line = resultsLine(target.name || target.id);
      resultsBox.appendChild(line);
      const messages = [];
      let allOk = true;
      for (const key of selectedCats) {
        try { await applyCategory(api, key, sourceCache[key], target.id, (m) => messages.push(m)); }
        catch (e) { allOk = false; messages.push(`❌ ${key}: ${e.message}`); }
      }
      setResultLine(line, target.name || target.id, allOk, messages);
    }
    applyBtn.disabled = false;
    toast('ההחלה הושלמה', 'success');
  } }, '🔁 החל הגדרות על הפרופילים הנבחרים');

  container.appendChild(card(
    'פרופיל מקור',
    'ההגדרות שנבחר להעתיק יילקחו מהפרופיל הזה',
    el('div', { class: 'field', style: 'max-width:320px' }, [sourceSelect]),
  ));
  container.appendChild(card('אילו הגדרות להעתיק', '', catList));
  container.appendChild(card('להחיל על אילו פרופילים', '', targetsHolder));
  container.appendChild(card('', '', el('div', {}, [applyBtn, resultsBox])));
}

// ---------- מצב ב׳ - View ----------

function renderDirectMode(container, api, profiles) {
  const targets = profileChecklist(profiles, null);

  const groupSelect = el('select', { 'data-role': 'action-group' });
  [
    { v: 'domain', l: '🌐 דומיין - הוספה/הסרה מרשימת הרשאה או חסימה' },
    { v: 'catsvc', l: '👨‍👩‍👧 קטגוריה/אפליקציה בבקרת הורים' },
    { v: 'toggle', l: '🔘 הגדרת מתג (אבטחה / פרטיות / בקרת הורים כללי)' },
  ].forEach((o) => groupSelect.appendChild(el('option', { value: o.v }, o.l)));

  const formHolder = el('div', {});

  function currentAction() {
    const group = groupSelect.value;
    if (group === 'domain') {
      const type = formHolder.querySelector('[data-role=domain-type]').value;
      const domain = formHolder.querySelector('[data-role=domain-value]').value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      return { group, type, domain };
    }
    if (group === 'catsvc') {
      const entryId = formHolder.querySelector('[data-role=catsvc-value]').value.trim();
      const active = formHolder.querySelector('[data-role=catsvc-active]').value === 'on';
      return { group, entryId, active };
    }
    const fieldIndex = Number(formHolder.querySelector('[data-role=toggle-field]').value);
    const active = formHolder.querySelector('[data-role=toggle-active]').value === 'on';
    return { group: 'toggle', fieldIndex, active };
  }

  function drawForm() {
    formHolder.innerHTML = '';
    const group = groupSelect.value;
    if (group === 'domain') {
      const typeSelect = el('select', { 'data-role': 'domain-type' }, [
        el('option', { value: 'allow-add' }, '✅ הוסף לרשימת הרשאה'),
        el('option', { value: 'deny-add' }, '⛔ הוסף לרשימת חסימה'),
        el('option', { value: 'allow-remove' }, '🗑️ הסר מרשימת הרשאה'),
        el('option', { value: 'deny-remove' }, '🗑️ הסר מרשימת חסימה'),
      ]);
      const domainInput = el('input', { 'data-role': 'domain-value', placeholder: 'example.com', style: 'direction:ltr;text-align:left' });
      formHolder.appendChild(el('div', { class: 'field' }, [el('label', {}, 'פעולה'), typeSelect]));
      formHolder.appendChild(el('div', { class: 'field' }, [el('label', {}, 'דומיין'), domainInput]));
      return;
    }
    if (group === 'catsvc') {
      const listId = 'bulk-catsvc-list';
      const datalist = el('datalist', { id: listId });
      Object.keys(CATEGORY_LABELS).forEach((id) => datalist.appendChild(el('option', { value: id }, categoryLabel(id))));
      Object.keys(SERVICE_LABELS).forEach((id) => datalist.appendChild(el('option', { value: id }, serviceLabel(id))));
      const entryInput = el('input', { 'data-role': 'catsvc-value', list: listId, placeholder: 'לדוגמה: tiktok, porn, netflix...', style: 'direction:ltr;text-align:left' });
      const activeSelect = el('select', { 'data-role': 'catsvc-active' }, [
        el('option', { value: 'on' }, '🚫 חסום'),
        el('option', { value: 'off' }, '✅ בטל חסימה'),
      ]);
      formHolder.appendChild(el('div', { class: 'field' }, [el('label', {}, 'קטגוריה או אפליקציה (מזהה)'), entryInput, datalist]));
      formHolder.appendChild(el('div', { class: 'field' }, [el('label', {}, 'פעולה'), activeSelect]));
      return;
    }
    const fieldSelect = el('select', { 'data-role': 'toggle-field' });
    TOGGLE_FIELDS.forEach((f, i) => fieldSelect.appendChild(el('option', { value: i }, f.title)));
    const activeSelect = el('select', { 'data-role': 'toggle-active' }, [
      el('option', { value: 'on' }, '✅ הפעל'),
      el('option', { value: 'off' }, '❌ כבה'),
    ]);
    formHolder.appendChild(el('div', { class: 'field' }, [el('label', {}, 'הגדרה'), fieldSelect]));
    formHolder.appendChild(el('div', { class: 'field' }, [el('label', {}, 'מצב'), activeSelect]));
  }
  drawForm();
  groupSelect.addEventListener('change', drawForm);

  const resultsBox = el('div', { style: 'margin-top:14px' });

  const applyBtn = el('button', { class: 'btn btn--full', onclick: async () => {
    const action = currentAction();
    if (action.group === 'domain' && !action.domain) { toast('נא להזין דומיין', 'error'); return; }
    if (action.group === 'catsvc' && !action.entryId) { toast('נא לבחור קטגוריה או אפליקציה', 'error'); return; }
    const selectedTargets = profiles.filter((p) => targets.checks[p.id]?.checked);
    if (!selectedTargets.length) { toast('בחרו לפחות פרופיל יעד אחד', 'error'); return; }

    const ok = await confirmModal({
      title: 'ביצוע פעולה',
      body: `להריץ את הפעולה שנבחרה על ${selectedTargets.length} פרופילים?`,
      confirmLabel: 'בצע',
      danger: false,
    });
    if (!ok) return;

    applyBtn.disabled = true;
    resultsBox.innerHTML = '';
    for (const target of selectedTargets) {
      const line = resultsLine(target.name || target.id);
      resultsBox.appendChild(line);
      try {
        await applyDirectAction(api, action, target.id);
        setResultLine(line, target.name || target.id, true, []);
      } catch (e) {
        setResultLine(line, target.name || target.id, false, [e.message]);
      }
    }
    applyBtn.disabled = false;
    toast('הפעולה הושלמה', 'success');
  } }, '⚡ בצע על הפרופילים הנבחרים');

  container.appendChild(card(
    'הפעולה',
    'בחרו פעולה אחת - למשל הוספת אתר לרשימת הרשאה, חסימת אפליקציה, או הפעלת הגדרת אבטחה - ותחילו אותה על כל הפרופילים שתבחרו למטה, בלי צורך בפרופיל מקור.',
    el('div', {}, [
      el('div', { class: 'field' }, [el('label', {}, 'סוג פעולה'), groupSelect]),
      formHolder,
    ]),
  ));
  container.appendChild(card('להחיל על אילו פרופילים', '', targets.node));
  container.appendChild(card('', '', el('div', {}, [applyBtn, resultsBox])));
}

// ---------- כניסה ----------

export async function render(container, ctx) {
  const { api, profiles } = ctx;
  container.innerHTML = '';

  if (profiles.length < 1) {
    container.appendChild(card('🔁 כמה פרופילים', '', el('p', {}, 'צרו פרופיל כדי להשתמש בכלי הזה.')));
    return;
  }

  const modeBar = el('div', { class: 'tabs', style: 'margin-bottom:20px' });
  const body = el('div', {});

  function setMode(mode) {
    modeBar.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
    body.innerHTML = '';
    if (mode === 'direct') {
      if (profiles.length < 1) { body.appendChild(el('p', {}, 'אין פרופילים.')); return; }
      renderDirectMode(body, api, profiles);
    } else {
      if (profiles.length < 2) { body.appendChild(el('p', {}, 'צריך לפחות שני פרופילים כדי להעתיק הגדרות בין פרופילים.')); return; }
      renderCopyMode(body, api, profiles);
    }
  }

  modeBar.appendChild(el('button', { class: 'tab', 'data-mode': 'direct', onclick: () => setMode('direct') }, '⚡ פעולה ישירה על כמה פרופילים'));
  modeBar.appendChild(el('button', { class: 'tab', 'data-mode': 'copy', onclick: () => setMode('copy') }, '📋 העתקת הגדרות מפרופיל אחד'));

  container.appendChild(modeBar);
  container.appendChild(body);
  setMode('direct');
}
