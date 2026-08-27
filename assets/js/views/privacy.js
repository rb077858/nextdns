import { el, reportError, toast } from '../util.js';
import { card, settingRow, spinner, emptyState } from '../components.js';

const NATIVE_TRACKERS = [
  { id: 'amazon', name: 'Amazon' }, { id: 'apple', name: 'Apple' },
  { id: 'facebook', name: 'Facebook / Meta' }, { id: 'google', name: 'Google' },
  { id: 'huawei', name: 'Huawei' }, { id: 'microsoft', name: 'Microsoft' },
  { id: 'motorola', name: 'Motorola' }, { id: 'mozilla', name: 'Mozilla' },
  { id: 'oneplus', name: 'OnePlus' }, { id: 'oppo', name: 'Oppo' },
  { id: 'roku', name: 'Roku' }, { id: 'samsung', name: 'Samsung' },
  { id: 'sonos', name: 'Sonos' }, { id: 'sony', name: 'Sony' },
  { id: 'vivo', name: 'Vivo' }, { id: 'xiaomi', name: 'Xiaomi' },
];

export async function render(container, ctx) {
  const { api, profileId } = ctx;
  container.appendChild(spinner());
  let privacy;
  try {
    privacy = await api.getPrivacy(profileId);
  } catch (e) {
    container.innerHTML = '';
    container.appendChild(card('שגיאה בטעינת הגדרות פרטיות', '', el('p', {}, e.message)));
    return;
  }
  container.innerHTML = '';

  const toggles = el('div', {});
  toggles.appendChild(settingRow({
    title: 'חסימת עוקבים מוסוואים (Disguised Trackers)',
    desc: 'חוסם סקריפטי מעקב שמסתתרים תחת דומיין ה-CDN של האתר עצמו',
    checked: !!privacy.disguisedTrackers,
    onChange: async (val) => { await api.patchPrivacy(profileId, { disguisedTrackers: val }); privacy.disguisedTrackers = val; toast('נשמר', 'success'); },
  }));
  toggles.appendChild(settingRow({
    title: 'אפשר קישורי שותפים (Affiliate)',
    desc: 'לא לחסום קישורי שיווק שותפים גם כשחוסמים פרסום/מעקב',
    checked: !!privacy.allowAffiliate,
    onChange: async (val) => { await api.patchPrivacy(profileId, { allowAffiliate: val }); privacy.allowAffiliate = val; toast('נשמר', 'success'); },
  }));
  container.appendChild(card('🕵️ פרטיות כללית', '', toggles));

  // --- Native trackers ---
  const natives = privacy.natives || [];
  const isNativeActive = (id) => natives.some((n) => n.id === id && n.active !== false);
  const nativesGrid = el('div', { class: 'chip-grid' });
  const renderNatives = () => {
    nativesGrid.innerHTML = '';
    NATIVE_TRACKERS.forEach((n) => {
      const on = isNativeActive(n.id);
      const chip = el('div', { class: `chip ${on ? 'on' : ''}`, style: 'cursor:pointer', onclick: async () => {
        try {
          const nextList = on ? natives.filter((x) => x.id !== n.id) : [...natives.filter((x) => x.id !== n.id), { id: n.id, active: true }];
          await api.patchPrivacy(profileId, { natives: nextList });
          privacy.natives = nextList;
          renderNatives();
          toast('נשמר', 'success');
        } catch (e) { reportError(e); }
      } }, [el('span', {}, n.name), el('span', {}, on ? '✓' : '')]);
      nativesGrid.appendChild(chip);
    });
  };
  renderNatives();
  container.appendChild(card('📡 חסימת מעקב יצרנים (Native Tracking)', 'חברות מכשירים ותוכנה רבות אוספות טלמטריה ברקע - ניתן לחסום לפי יצרן', nativesGrid));

  // --- Blocklists ---
  const blocklists = privacy.blocklists || [];
  const blWrap = el('div', {});
  const renderBl = () => {
    blWrap.innerHTML = '';
    if (!blocklists.length) { blWrap.appendChild(emptyState('לא הוגדרו רשימות חסימה (Blocklists) עבור הפרופיל')); return; }
    blocklists.forEach((b) => {
      blWrap.appendChild(el('div', { class: 'list-row' }, [
        el('span', { class: 'list-row__domain', style: 'direction:rtl' }, b.name || b.id),
        b.entries ? el('span', { class: 'badge badge--gray' }, `${b.entries.toLocaleString('he')} רשומות`) : null,
        el('button', {
          class: 'btn btn--ghost btn--sm',
          onclick: async () => {
            try {
              const next = blocklists.filter((x) => x.id !== b.id);
              await api.patchPrivacy(profileId, { blocklists: next.map((x) => ({ id: x.id })) });
              privacy.blocklists = next;
              renderBl();
              toast('הוסרה', 'success');
            } catch (e) { reportError(e); }
          },
        }, 'הסר'),
      ]));
    });
  };
  renderBl();

  const blInput = el('input', { placeholder: 'מזהה רשימת חסימה (מ-my.nextdns.io)' });
  const addBl = async () => {
    const val = blInput.value.trim();
    if (!val) return;
    try {
      const next = [...blocklists.map((x) => ({ id: x.id })), { id: val }];
      await api.patchPrivacy(profileId, { blocklists: next });
      blocklists.push({ id: val });
      blInput.value = '';
      renderBl();
      toast('נוספה רשימת חסימה', 'success');
    } catch (e) { reportError(e); }
  };
  blInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addBl(); });

  container.appendChild(card(
    '📋 רשימות חסימה (Blocklists)',
    'רשימות פרטיות מוכנות מראש (כמו OISD). ניתן להוסיף/להסיר, אך להוספה יש להעתיק את מזהה הרשימה מתוך מסך "Privacy" באתר my.nextdns.io - ה-API אינו חושף קטלוג מלא',
    el('div', {}, [
      el('div', { class: 'inline-form', style: 'margin-bottom:14px' }, [
        el('div', { class: 'field' }, [blInput]),
        el('button', { class: 'btn', onclick: addBl }, 'הוסף'),
      ]),
      blWrap,
    ]),
  ));
}
