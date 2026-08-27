import { el, reportError, toast } from '../util.js';
import { card, settingRow, spinner, emptyState } from '../components.js';

export const FIELDS = [
  { key: 'threatIntelligenceFeeds', title: 'מודיעין איומים (Threat Intelligence)', desc: 'חסימת דומיינים ממאגרי איומים בזמן אמת' },
  { key: 'aiThreatDetection', title: 'זיהוי איומים מבוסס AI', desc: 'זיהוי דומיינים זדוניים חדשים באמצעות בינה מלאכותית' },
  { key: 'googleSafeBrowsing', title: 'Google Safe Browsing', desc: 'חסימת אתרי דיוג (Phishing) ותוכנות זדוניות' },
  { key: 'cryptojacking', title: 'כרייה נסתרת (Cryptojacking)', desc: 'חסימת סקריפטים שמכרים מטבעות קריפטו ברקע' },
  { key: 'dnsRebinding', title: 'הגנת DNS Rebinding', desc: 'מניעת התקפות שעוקפות הגנות רשת פנימית' },
  { key: 'idnHomographs', title: 'דומיינים דומים (Homograph)', desc: 'חסימת דומיינים המחקים אתרים מוכרים בעזרת תווים דומים' },
  { key: 'typosquatting', title: 'טעויות הקלדה (Typosquatting)', desc: 'חסימת דומיינים המנצלים שגיאות הקלדה נפוצות' },
  { key: 'dga', title: 'דומיינים שנוצרו אלגוריתמית (DGA)', desc: 'זיהוי דומיינים המשמשים תוכנות זדוניות ו-botnets' },
  { key: 'nrd', title: 'דומיינים חדשים (NRD)', desc: 'חסימת דומיינים שנרשמו לאחרונה - נפוץ בהתקפות' },
  { key: 'ddns', title: 'Dynamic DNS', desc: 'חסימת ספקי DNS דינמי המנוצלים לעיתים לתקיפות' },
  { key: 'parking', title: 'דומיינים חונים (Parked)', desc: 'חסימת אתרים לא פעילים המשמשים לפרסום או הונאה' },
  { key: 'csam', title: 'תוכן פגיעה בקטינים (CSAM)', desc: 'חסימה חובה של דומיינים המפרים תקנות הגנת ילדים' },
];

export async function render(container, ctx) {
  const { api, profileId } = ctx;
  container.appendChild(spinner());
  let security;
  try {
    security = await api.getSecurity(profileId);
  } catch (e) {
    container.innerHTML = '';
    container.appendChild(card('שגיאה בטעינת הגדרות אבטחה', '', el('p', {}, e.message)));
    return;
  }
  container.innerHTML = '';

  const rowsWrap = el('div', {});
  FIELDS.forEach((f) => {
    rowsWrap.appendChild(settingRow({
      title: f.title,
      desc: f.desc,
      checked: !!security[f.key],
      onChange: async (val) => {
        await api.patchSecurity(profileId, { [f.key]: val });
        security[f.key] = val;
        toast('ההגדרה נשמרה', 'success');
      },
    }));
  });
  container.appendChild(card('🛡️ הגנות אבטחה', 'שכבות הגנה אוטומטיות שאינן תלויות ברשימת אתרים ספציפית', rowsWrap));

  // --- TLD blocking ---
  const tlds = security.tlds || [];
  const listWrap = el('div', {});
  const renderList = () => {
    listWrap.innerHTML = '';
    if (!tlds.length) { listWrap.appendChild(emptyState('לא נחסמו סיומות דומיין (TLD)')); return; }
    tlds.forEach((t) => {
      listWrap.appendChild(el('div', { class: 'list-row' }, [
        el('span', { class: 'list-row__domain' }, `.${t.id}`),
        el('button', {
          class: 'btn btn--ghost btn--sm',
          onclick: async () => {
            try {
              const next = tlds.filter((x) => x.id !== t.id);
              await api.patchSecurity(profileId, { tlds: next });
              tlds.length = 0; tlds.push(...next);
              renderList();
              toast('הוסר', 'success');
            } catch (e) { reportError(e); }
          },
        }, 'הסר'),
      ]));
    });
  };
  renderList();

  const tldInput = el('input', { placeholder: 'לדוגמה: xyz (ללא נקודה)' });
  const addTld = async () => {
    const val = tldInput.value.trim().replace(/^\./, '').toLowerCase();
    if (!val) return;
    if (tlds.some((t) => t.id === val)) { toast('הסיומת כבר ברשימה', 'info'); return; }
    try {
      const next = [...tlds, { id: val }];
      await api.patchSecurity(profileId, { tlds: next });
      tlds.push({ id: val });
      tldInput.value = '';
      renderList();
      toast('נחסמה סיומת ' + val, 'success');
    } catch (e) { reportError(e); }
  };
  tldInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addTld(); });

  container.appendChild(card(
    '🌐 חסימת סיומות דומיין (TLD)',
    'חסימת כל האתרים תחת סיומת מסוימת (כמו ‎.xyz‎ או ‎.top‎), הנפוצות בספאם ותרמיות',
    el('div', {}, [
      el('div', { class: 'inline-form', style: 'margin-bottom:14px' }, [
        el('div', { class: 'field' }, [tldInput]),
        el('button', { class: 'btn', onclick: addTld }, 'חסום סיומת'),
      ]),
      listWrap,
    ]),
  ));
}
