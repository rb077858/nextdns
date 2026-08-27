import { el, reportError, toast, COMMON_TLDS } from '../util.js';
import { card, spinner, emptyState, confirmModal, hintBanner } from '../components.js';

function domainListCard({ title, desc, items, onAdd, onRemove, onToggle }) {
  const wrap = el('div', {});
  const draw = () => {
    wrap.innerHTML = '';
    if (!items.length) { wrap.appendChild(emptyState('הרשימה ריקה')); return; }
    items.forEach((it) => {
      const activeSwitchInput = el('input', { type: 'checkbox' });
      activeSwitchInput.checked = it.active !== false;
      activeSwitchInput.addEventListener('change', async () => {
        activeSwitchInput.disabled = true;
        try { await onToggle(it.id, activeSwitchInput.checked); it.active = activeSwitchInput.checked; }
        catch (e) { activeSwitchInput.checked = !activeSwitchInput.checked; reportError(e); }
        finally { activeSwitchInput.disabled = false; }
      });
      wrap.appendChild(el('div', { class: 'list-row' }, [
        el('span', { class: 'list-row__domain' }, it.id),
        el('label', { class: 'switch', style: 'width:38px;height:22px' }, [activeSwitchInput, el('span', { class: 'switch__track' })]),
        el('button', {
          class: 'btn btn--ghost btn--sm',
          onclick: async () => {
            try { await onRemove(it.id); items.splice(items.indexOf(it), 1); draw(); toast('הוסר', 'success'); }
            catch (e) { reportError(e); }
          },
        }, 'הסר'),
      ]));
    });
  };
  draw();

  const input = el('input', { placeholder: 'example.com', style: 'direction:ltr;text-align:left' });
  const add = async () => {
    let val = input.value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!val) return;
    if (items.some((x) => x.id === val)) { toast('כבר קיים ברשימה', 'info'); return; }
    try {
      await onAdd(val);
      items.push({ id: val, active: true });
      input.value = '';
      draw();
      toast('נוסף בהצלחה', 'success');
    } catch (e) { reportError(e); }
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });

  return card(title, desc, el('div', {}, [
    el('div', { class: 'inline-form', style: 'margin-bottom:14px' }, [
      el('div', { class: 'field' }, [input]),
      el('button', { class: 'btn', onclick: add }, 'הוסף'),
    ]),
    wrap,
  ]));
}

export async function render(container, ctx) {
  const { api, profileId } = ctx;
  container.appendChild(spinner());
  let denylist, allowlist, security;
  try {
    [denylist, allowlist, security] = await Promise.all([
      api.getDenylist(profileId), api.getAllowlist(profileId), api.getSecurity(profileId),
    ]);
  } catch (e) {
    container.innerHTML = '';
    container.appendChild(card('שגיאה בטעינת הרשימות', '', el('p', {}, e.message)));
    return;
  }
  container.innerHTML = '';
  denylist = denylist || []; allowlist = allowlist || [];

  container.appendChild(domainListCard({
    title: '✅ רשימת הרשאה (Allowlist)',
    desc: 'דומיינים שיהיו מותרים תמיד, גם אם נחסמים על ידי הגדרה אחרת',
    items: allowlist,
    onAdd: (d) => api.addAllowlist(profileId, d),
    onRemove: (d) => api.removeAllowlist(profileId, d),
    onToggle: (d, v) => api.setAllowlistActive(profileId, d, v),
  }));

  container.appendChild(domainListCard({
    title: '⛔ רשימת חסימה (Denylist)',
    desc: 'דומיינים ספציפיים שייחסמו תמיד עבור פרופיל זה',
    items: denylist,
    onAdd: (d) => api.addDenylist(profileId, d),
    onRemove: (d) => api.removeDenylist(profileId, d),
    onToggle: (d, v) => api.setDenylistActive(profileId, d, v),
  }));

  // --- מצב הרשאה בלבד (allow-only) ---
  renderAllowOnly(container, api, profileId, security);
}

function renderAllowOnly(container, api, profileId, security) {
  security.tlds = security.tlds || [];
  const slot = el('div', {});

  function draw() {
    slot.innerHTML = '';
    const tlds = security.tlds;
    const blockedSet = new Set(tlds.map((t) => t.id));
    const allBlocked = COMMON_TLDS.every((t) => blockedSet.has(t));

    slot.appendChild(el('p', { style: 'font-size:13px;color:var(--text-dim);margin:0 0 14px' },
      allBlocked
        ? `✅ מצב פעיל: ${COMMON_TLDS.length} סיומות דומיין נפוצות חסומות. הוסיפו אתרים מותרים ל"רשימת הרשאה" למעלה.`
        : `הסיומת חסומה כרגע: ${tlds.filter((t) => COMMON_TLDS.includes(t.id)).length} מתוך ${COMMON_TLDS.length} הנפוצות.`));

    const btn = el('button', { class: `btn ${allBlocked ? 'btn--danger' : ''}`, onclick: async () => {
      const turnOn = !allBlocked;
      const ok = await confirmModal({
        title: turnOn ? 'הפעלת מצב הרשאה בלבד' : 'ביטול מצב הרשאה בלבד',
        body: turnOn
          ? `הפעולה תחסום ${COMMON_TLDS.length} סיומות דומיין נפוצות (‎.com‎, ‎.net‎, ‎.io‎ ועוד). כל אתר שלא נמצא ב"רשימת הרשאה" למעלה ייחסם. <b>יש להוסיף קודם את האתרים הרצויים לרשימת ההרשאה</b> כדי לא לחסום גישה לאתרים חיוניים.`
          : 'הפעולה תסיר את חסימת הסיומות הנפוצות ותחזיר גלישה חופשית (בכפוף לשאר ההגדרות).',
        confirmLabel: turnOn ? 'הפעל חסימה' : 'בטל חסימה',
        danger: turnOn,
      });
      if (!ok) return;
      try {
        const next = turnOn
          ? [...tlds.filter((t) => !COMMON_TLDS.includes(t.id)), ...COMMON_TLDS.map((id) => ({ id }))]
          : tlds.filter((t) => !COMMON_TLDS.includes(t.id));
        await api.patchSecurity(profileId, { tlds: next });
        security.tlds = next;
        draw();
        toast('ההגדרה עודכנה', 'success');
      } catch (e) { reportError(e); }
    } }, allBlocked ? '🔓 בטל מצב הרשאה בלבד' : '🔒 הפעל מצב הרשאה בלבד');
    slot.appendChild(btn);
  }
  draw();

  container.appendChild(card(
    '🔒 מצב "הרשאה בלבד" (חסום הכל חוץ מהמותר)',
    '',
    el('div', {}, [
      hintBanner('NextDNS אינו תומך רשמית ב"חסום הכל חוץ ממה שהותר במפורש". זהו <b>קירוב</b> החוסם את סיומות הדומיין (TLD) הנפוצות ביותר (com, net, org, io ועוד) - אתר עם סיומת נדירה עלול לא להיחסם. לשליטה מלאה ואמינה, שקלו ליצור פרופיל ייעודי "נעול" ולהוסיף רק את האתרים המורשים ל"רשימת הרשאה".'),
      slot,
    ]),
  ));
}
