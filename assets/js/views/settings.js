import { el, reportError, toast, debounce } from '../util.js';
import { card, settingRow, spinner } from '../components.js';

const RETENTION_OPTIONS = [
  { v: 1, label: 'יום אחד' },
  { v: 7, label: 'שבוע' },
  { v: 30, label: 'חודש' },
  { v: 90, label: '3 חודשים' },
  { v: 182, label: '6 חודשים' },
  { v: 365, label: 'שנה' },
];

export async function render(container, ctx) {
  const { api, profileId } = ctx;
  container.appendChild(spinner());
  let settings;
  try {
    settings = await api.getSettings(profileId);
  } catch (e) {
    container.innerHTML = '';
    container.appendChild(card('שגיאה בטעינת הגדרות', '', el('p', {}, e.message)));
    return;
  }
  container.innerHTML = '';
  settings.logs = settings.logs || { enabled: true, drop: {}, retention: 30 };
  settings.performance = settings.performance || {};
  settings.blockPage = settings.blockPage || {};

  const patchLogs = debounce(async (body) => {
    try { await api.patchSettings(profileId, { logs: { ...settings.logs, ...body } }); Object.assign(settings.logs, body); toast('נשמר', 'success'); }
    catch (e) { reportError(e); }
  }, 300);

  const logsWrap = el('div', {});
  logsWrap.appendChild(settingRow({
    title: 'שמירת יומן שאילתות',
    desc: 'ללא שמירת יומן לא ניתן יהיה לצפות בפעילות או במכשירים',
    checked: settings.logs.enabled !== false,
    onChange: async (val) => { await api.patchSettings(profileId, { logs: { ...settings.logs, enabled: val } }); settings.logs.enabled = val; toast('נשמר', 'success'); },
  }));
  logsWrap.appendChild(settingRow({
    title: 'הסתרת כתובות IP ביומן',
    desc: 'לא לשמור את כתובת ה-IP של המכשיר בפרטי היומן (פרטיות מוגברת)',
    checked: !!settings.logs.drop?.ip,
    onChange: (val) => patchLogs({ drop: { ...settings.logs.drop, ip: val } }),
  }));
  logsWrap.appendChild(settingRow({
    title: 'הסתרת דומיינים ביומן',
    desc: 'לשמור רק מטא-דאטה בלי שם הדומיין המדויק שנשאל',
    checked: !!settings.logs.drop?.domain,
    onChange: (val) => patchLogs({ drop: { ...settings.logs.drop, domain: val } }),
  }));

  const retentionSelect = el('select', {});
  RETENTION_OPTIONS.forEach((o) => retentionSelect.appendChild(el('option', { value: o.v, selected: o.v === settings.logs.retention || undefined }, o.label)));
  retentionSelect.addEventListener('change', async () => {
    try { await api.patchSettings(profileId, { logs: { ...settings.logs, retention: Number(retentionSelect.value) } }); settings.logs.retention = Number(retentionSelect.value); toast('נשמר', 'success'); }
    catch (e) { reportError(e); }
  });
  logsWrap.appendChild(el('div', { class: 'field', style: 'margin-top:14px;max-width:260px' }, [el('label', {}, 'משך שמירת היומן'), retentionSelect]));

  container.appendChild(card('📊 יומן ופרטיות', '', logsWrap));

  const generalWrap = el('div', {});
  generalWrap.appendChild(settingRow({
    title: 'דף חסימה מותאם אישית',
    desc: 'הצגת דף הסבר כאשר אתר נחסם, במקום שגיאת דפדפן גנרית',
    checked: !!settings.blockPage.enabled,
    onChange: async (val) => { await api.patchSettings(profileId, { blockPage: { enabled: val } }); settings.blockPage.enabled = val; toast('נשמר', 'success'); },
  }));
  generalWrap.appendChild(settingRow({
    title: 'תמיכת Web3',
    desc: 'פענוח דומייני בלוקצ׳יין (ENS, Handshake וכו׳)',
    checked: !!settings.web3,
    onChange: async (val) => { await api.patchSettings(profileId, { web3: val }); settings.web3 = val; toast('נשמר', 'success'); },
  }));
  container.appendChild(card('⚙️ כללי', '', generalWrap));

  const perfWrap = el('div', {});
  perfWrap.appendChild(settingRow({
    title: 'האצת מטמון (Cache Boost)',
    desc: 'שיפור זמני תגובה על ידי שמירת תשובות DNS פופולריות',
    checked: !!settings.performance.cacheBoost,
    onChange: async (val) => { await api.patchSettings(profileId, { performance: { ...settings.performance, cacheBoost: val } }); settings.performance.cacheBoost = val; toast('נשמר', 'success'); },
  }));
  perfWrap.appendChild(settingRow({
    title: 'CNAME Flattening',
    desc: 'שיפור תאימות ומהירות לאתרים המשתמשים בהפניות CNAME',
    checked: !!settings.performance.cnameFlattening,
    onChange: async (val) => { await api.patchSettings(profileId, { performance: { ...settings.performance, cnameFlattening: val } }); settings.performance.cnameFlattening = val; toast('נשמר', 'success'); },
  }));
  perfWrap.appendChild(settingRow({
    title: 'ECS (EDNS Client Subnet)',
    desc: 'שיפור דיוק גיאוגרפי של CDNs (מומלץ להשאיר כבוי לפרטיות מרבית)',
    checked: !!settings.performance.ecs,
    onChange: async (val) => { await api.patchSettings(profileId, { performance: { ...settings.performance, ecs: val } }); settings.performance.ecs = val; toast('נשמר', 'success'); },
  }));
  container.appendChild(card('⚡ ביצועים', '', perfWrap));
}
