import { el, reportError, toast, debounce, WEEKDAYS } from '../util.js';
import { card, settingRow, spinner, hintBanner } from '../components.js';
import { categoryLabel, serviceLabel } from '../labels.js';

function getTimezones() {
  try {
    if (typeof Intl.supportedValuesOf === 'function') return Intl.supportedValuesOf('timeZone');
  } catch { /* ignore */ }
  return ['Asia/Jerusalem', 'UTC', 'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Los_Angeles'];
}

function chipGrid(items, { getActive, getRecreation, onToggleActive, onToggleRecreation, labelFn }) {
  const grid = el('div', { class: 'chip-grid' });
  items.forEach((item) => {
    const on = getActive(item.id);
    const rec = getRecreation(item.id);
    const chip = el('div', { class: `chip ${on ? 'on' : ''}` }, [
      el('span', { style: 'cursor:pointer;flex:1', onclick: () => onToggleActive(item.id, !on) }, labelFn(item.id)),
      el('button', {
        class: `chip__rec ${rec ? 'on' : ''}`,
        title: 'חסום רק מחוץ לשעות הפנאי המתוזמנות',
        onclick: (e) => { e.stopPropagation(); onToggleRecreation(item.id, !rec); },
      }, '⏰'),
    ]);
    grid.appendChild(chip);
  });
  return grid;
}

export async function render(container, ctx) {
  const { api, profileId } = ctx;
  container.appendChild(spinner());
  let pc;
  try {
    pc = await api.getParentalControl(profileId);
  } catch (e) {
    container.innerHTML = '';
    container.appendChild(card('שגיאה בטעינת בקרת הורים', '', el('p', {}, e.message)));
    return;
  }
  container.innerHTML = '';

  pc.categories = pc.categories || [];
  pc.services = pc.services || [];

  // --- toggles כלליים ---
  const generalWrap = el('div', {});
  [
    { key: 'safeSearch', title: 'חיפוש בטוח (SafeSearch)', desc: 'אכיפת חיפוש בטוח ב-Google, Bing, DuckDuckGo ועוד' },
    { key: 'youtubeRestrictedMode', title: 'מצב מוגבל ב-YouTube', desc: 'הסתרת תוכן לא מתאים בתוצאות ובהמלצות YouTube' },
    { key: 'blockBypass', title: 'חסימת עקיפת בקרת הורים', desc: 'חוסם VPN, שרתי פרוקסי ואפליקציות המשמשות לעקיפת ההגבלות' },
  ].forEach((f) => {
    generalWrap.appendChild(settingRow({
      title: f.title, desc: f.desc, checked: !!pc[f.key],
      onChange: async (val) => { await api.patchParentalControl(profileId, { [f.key]: val }); pc[f.key] = val; toast('נשמר', 'success'); },
    }));
  });
  container.appendChild(card('👨‍👩‍👧 בקרת הורים - הגדרות כלליות', '', generalWrap));

  container.appendChild(hintBanner(
    'לחיצה על שם קטגוריה/אפליקציה חוסמת אותה. הכפתור <b>⏰</b> לצידה מסמן שהחסימה תחול <b>רק מחוץ</b> לשעות הפנאי שתגדירו למטה ("זמן מסך") - כלומר בשעות הפנאי היא תהיה מותרת.',
  ));

  // --- קטגוריות ---
  const catGridHolder = el('div', {});
  function drawCategories() {
    catGridHolder.innerHTML = '';
    catGridHolder.appendChild(chipGrid(pc.categories, {
      getActive: (id) => pc.categories.find((c) => c.id === id)?.active,
      getRecreation: (id) => pc.categories.find((c) => c.id === id)?.recreation,
      labelFn: categoryLabel,
      onToggleActive: async (id, val) => {
        try {
          const next = pc.categories.map((c) => (c.id === id ? { ...c, active: val } : c));
          await api.patchParentalControl(profileId, { categories: next });
          pc.categories = next;
          drawCategories();
          toast('נשמר', 'success');
        } catch (e) { reportError(e); }
      },
      onToggleRecreation: async (id, val) => {
        try {
          const next = pc.categories.map((c) => (c.id === id ? { ...c, recreation: val } : c));
          await api.patchParentalControl(profileId, { categories: next });
          pc.categories = next;
          drawCategories();
          toast('נשמר', 'success');
        } catch (e) { reportError(e); }
      },
    }));
  }
  drawCategories();
  container.appendChild(card('🏷️ קטגוריות תוכן', 'חסימה גורפת של סוגי תוכן שלמים', catGridHolder));

  // --- שירותים/אפליקציות עם חיפוש ---
  const search = el('input', { placeholder: '🔎 חפש אפליקציה או אתר... (טיקטוק, יוטיוב, נטפליקס...)', class: 'chip-search' });
  const servicesGridHolder = el('div', {});
  function drawServices(filter = '') {
    servicesGridHolder.innerHTML = '';
    const items = pc.services.filter((s) => !filter || s.id.includes(filter.toLowerCase()) || serviceLabel(s.id).toLowerCase().includes(filter.toLowerCase()));
    if (!items.length) { servicesGridHolder.appendChild(el('div', { class: 'empty-state' }, 'לא נמצאו תוצאות')); return; }
    servicesGridHolder.appendChild(chipGrid(items, {
      getActive: (id) => pc.services.find((s) => s.id === id)?.active,
      getRecreation: (id) => pc.services.find((s) => s.id === id)?.recreation,
      labelFn: serviceLabel,
      onToggleActive: async (id, val) => {
        try {
          const next = pc.services.map((s) => (s.id === id ? { ...s, active: val } : s));
          await api.patchParentalControl(profileId, { services: next });
          pc.services = next;
          drawServices(search.value);
          toast('נשמר', 'success');
        } catch (e) { reportError(e); }
      },
      onToggleRecreation: async (id, val) => {
        try {
          const next = pc.services.map((s) => (s.id === id ? { ...s, recreation: val } : s));
          await api.patchParentalControl(profileId, { services: next });
          pc.services = next;
          drawServices(search.value);
          toast('נשמר', 'success');
        } catch (e) { reportError(e); }
      },
    }));
  }
  search.addEventListener('input', debounce(() => drawServices(search.value), 150));
  drawServices();
  container.appendChild(card('📱 אפליקציות ואתרים ספציפיים', `${pc.services.length} אפליקציות זמינות לחסימה`, el('div', {}, [search, servicesGridHolder])));

  // --- לוח זמנים לשעות פנאי (Recreation) ---
  renderSchedule(container, api, profileId, pc);
}

function renderSchedule(container, api, profileId, pc) {
  const rec = pc.recreation || { times: {}, timezone: 'Asia/Jerusalem' };
  const times = rec.times || {};
  const tzSelect = el('select', {});
  getTimezones().forEach((tz) => {
    tzSelect.appendChild(el('option', { value: tz, selected: tz === rec.timezone || undefined }, tz));
  });
  if (!rec.timezone) tzSelect.value = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const grid = el('div', { class: 'schedule-grid' });
  const rowsState = {};

  function buildRow(day) {
    const dayTimes = times[day.key];
    const enabled = !!dayTimes;
    const startInput = el('input', { type: 'time', value: dayTimes?.start || '15:00', disabled: !enabled });
    const endInput = el('input', { type: 'time', value: dayTimes?.end || '19:00', disabled: !enabled });
    const enableInput = el('input', { type: 'checkbox' });
    enableInput.checked = enabled;
    enableInput.addEventListener('change', () => {
      startInput.disabled = !enableInput.checked;
      endInput.disabled = !enableInput.checked;
      row.classList.toggle('disabled', !enableInput.checked);
    });
    const row = el('div', { class: `schedule-row ${enabled ? '' : 'disabled'}` }, [
      el('label', { class: 'switch', style: 'width:38px;height:22px' }, [enableInput, el('span', { class: 'switch__track' })]),
      el('span', { class: 'schedule-row__day' }, day.label),
      el('div', { class: 'schedule-row__times' }, [
        startInput, el('span', {}, '—'), endInput,
      ]),
    ]);
    rowsState[day.key] = { enableInput, startInput, endInput };
    return row;
  }
  WEEKDAYS.forEach((d) => grid.appendChild(buildRow(d)));

  const saveBtn = el('button', { class: 'btn btn--full', onclick: async () => {
    const newTimes = {};
    for (const day of WEEKDAYS) {
      const s = rowsState[day.key];
      if (s.enableInput.checked) newTimes[day.key] = { start: s.startInput.value, end: s.endInput.value };
    }
    saveBtn.disabled = true;
    saveBtn.textContent = 'שומר...';
    try {
      await api.patchParentalControl(profileId, { recreation: { times: newTimes, timezone: tzSelect.value } });
      toast('לוח הזמנים נשמר', 'success');
    } catch (e) {
      reportError(e, 'שמירת לוח הזמנים נכשלה. זהו תחום שידוע כלא יציב ב-API של NextDNS - נסו שוב בעוד רגע.');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = '💾 שמור לוח זמנים';
    }
  } }, '💾 שמור לוח זמנים');

  container.appendChild(card(
    '⏰ לוח זמנים - שעות פנאי (זמן מסך)',
    'הגדירו לכל יום בשבוע חלון שעות שבו אפליקציות/קטגוריות המסומנות ב-⏰ יהיו מותרות. מחוץ לחלון הן ייחסמו אוטומטית.',
    el('div', {}, [
      el('div', { class: 'field', style: 'max-width:260px;margin-bottom:16px' }, [
        el('label', {}, 'אזור זמן'),
        tzSelect,
      ]),
      grid,
      saveBtn,
    ]),
  ));
}
