import { el, reportError, toast } from '../util.js';
import { card, spinner, confirmModal } from '../components.js';

const CATEGORIES = [
  { key: 'security', label: '🛡️ אבטחה', desc: 'כל הגדרות ה-Security, כולל חסימת TLD' },
  { key: 'privacy', label: '🕵️ פרטיות', desc: 'חסימת מעקב יצרנים, רשימות חסימה, ועוד' },
  { key: 'parental', label: '👨‍👩‍👧 בקרת הורים', desc: 'קטגוריות, אפליקציות, SafeSearch ולוח הזמנים' },
  { key: 'denylist', label: '⛔ רשימת חסימה', desc: 'הוספת הדומיינים החסומים (לא מוחק דומיינים קיימים ביעד)' },
  { key: 'allowlist', label: '✅ רשימת הרשאה', desc: 'הוספת הדומיינים המותרים (לא מוחק דומיינים קיימים ביעד)' },
  { key: 'rewrites', label: '🔀 שכתובים', desc: 'הוספת שכתובי DNS (לא מוחק שכתובים קיימים ביעד)' },
  { key: 'settings', label: '⚙️ הגדרות', desc: 'יומן, דף חסימה וביצועים' },
];

function sanitizeIdActive(arr) {
  return (arr || []).map((x) => ({ id: x.id, active: x.active, recreation: x.recreation }));
}

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

export async function render(container, ctx) {
  const { api, profiles } = ctx;
  container.innerHTML = '';

  if (profiles.length < 2) {
    container.appendChild(card('🔁 החלת הגדרות על כמה פרופילים', '', el('p', {}, 'צריך לפחות שני פרופילים כדי להשתמש בכלי הזה. צרו פרופיל נוסף מהסרגל הצדדי.')));
    return;
  }

  const sourceSelect = el('select', {});
  profiles.forEach((p) => sourceSelect.appendChild(el('option', { value: p.id }, p.name || p.id)));

  const catChecks = {};
  const catList = el('div', {});
  CATEGORIES.forEach((c) => {
    const cb = el('input', { type: 'checkbox' });
    catChecks[c.key] = cb;
    catList.appendChild(el('div', { class: 'setting-row' }, [
      el('div', { class: 'setting-row__text' }, [el('strong', {}, c.label), el('span', {}, c.desc)]),
      el('label', { class: 'switch' }, [cb, el('span', { class: 'switch__track' })]),
    ]));
  });

  const targetChecks = {};
  const targetList = el('div', {});
  function drawTargets() {
    targetList.innerHTML = '';
    profiles.filter((p) => p.id !== sourceSelect.value).forEach((p) => {
      const cb = el('input', { type: 'checkbox' });
      targetChecks[p.id] = cb;
      targetList.appendChild(el('div', { class: 'setting-row' }, [
        el('div', { class: 'setting-row__text' }, [el('strong', {}, p.name || p.id)]),
        el('label', { class: 'switch' }, [cb, el('span', { class: 'switch__track' })]),
      ]));
    });
  }
  drawTargets();
  sourceSelect.addEventListener('change', drawTargets);

  const selectAllBtn = el('button', { class: 'btn btn--ghost btn--sm', onclick: () => Object.values(targetChecks).forEach((c) => { c.checked = true; }) }, 'סמן הכל');
  const clearAllBtn = el('button', { class: 'btn btn--ghost btn--sm', onclick: () => Object.values(targetChecks).forEach((c) => { c.checked = false; }) }, 'נקה בחירה');

  const resultsBox = el('div', { style: 'margin-top:14px' });

  const applyBtn = el('button', { class: 'btn btn--full', onclick: async () => {
    const selectedCats = CATEGORIES.filter((c) => catChecks[c.key].checked).map((c) => c.key);
    const selectedTargets = profiles.filter((p) => targetChecks[p.id]?.checked);
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
      const line = el('div', { class: 'list-row' }, [el('span', {}, `⏳ ${target.name || target.id}`)]);
      resultsBox.appendChild(line);
      const messages = [];
      let allOk = true;
      for (const key of selectedCats) {
        try {
          await applyCategory(api, key, sourceCache[key], target.id, (m) => messages.push(m));
        } catch (e) {
          allOk = false;
          messages.push(`❌ ${key}: ${e.message}`);
        }
      }
      line.innerHTML = '';
      line.appendChild(el('span', {}, `${allOk ? '✅' : '⚠️'} ${target.name || target.id}`));
      if (messages.length) line.appendChild(el('span', { style: 'font-size:12px;color:var(--text-dim)' }, messages.join(' · ')));
    }
    applyBtn.disabled = false;
    toast('ההחלה הושלמה', 'success');
  } }, '🔁 החל הגדרות על הפרופילים הנבחרים');

  container.appendChild(card(
    '🔁 החלת הגדרות על כמה פרופילים',
    'בחרו פרופיל מקור, אילו הגדרות להעתיק ממנו, ועל אילו פרופילים להחיל אותן - על כולם או רק על חלק.',
    el('div', {}, [
      el('div', { class: 'field', style: 'max-width:320px' }, [el('label', {}, 'פרופיל מקור'), sourceSelect]),
    ]),
  ));

  container.appendChild(card('אילו הגדרות להעתיק', '', catList));

  container.appendChild(card(
    'להחיל על אילו פרופילים',
    '',
    el('div', {}, [
      el('div', { style: 'display:flex;gap:8px;margin-bottom:10px' }, [selectAllBtn, clearAllBtn]),
      targetList,
    ]),
  ));

  container.appendChild(card('', '', el('div', {}, [applyBtn, resultsBox])));
}
