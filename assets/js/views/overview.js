import { el, debounce, reportError, toast, copyToClipboard } from '../util.js';
import { card, statCard, spinner, confirmModal } from '../components.js';

export async function render(container, ctx) {
  const { api, profileId } = ctx;
  container.appendChild(spinner());

  let profile, security, privacy, parental, devices;
  try {
    [profile, security, privacy, parental, devices] = await Promise.all([
      api.getProfile(profileId),
      api.getSecurity(profileId).catch(() => null),
      api.getPrivacy(profileId).catch(() => null),
      api.getParentalControl(profileId).catch(() => null),
      api.getAnalyticsDevices(profileId).catch(() => []),
    ]);
  } catch (e) {
    container.innerHTML = '';
    container.appendChild(card('שגיאה', '', el('p', {}, e.message || 'לא ניתן לטעון את הפרופיל')));
    return;
  }

  container.innerHTML = '';

  const activeCategories = (parental?.categories || []).filter((c) => c.active).length;
  const activeServices = (parental?.services || []).filter((s) => s.active).length;
  const activeSecurity = security ? Object.entries(security).filter(([k, v]) => typeof v === 'boolean' && v).length : 0;
  const deviceCount = Array.isArray(devices) ? devices.length : 0;

  const stats = el('div', { class: 'grid-cards', style: 'margin-bottom:18px' }, [
    statCard('🛡️ הגנות אבטחה פעילות', activeSecurity),
    statCard('🚫 קטגוריות חסומות', activeCategories),
    statCard('📱 אפליקציות מוגבלות', activeServices),
    statCard('💻 מכשירים פעילים', deviceCount),
  ]);
  container.appendChild(stats);

  // --- שם הפרופיל ---
  const nameField = el('input', { value: profile.name || '', placeholder: 'שם הפרופיל' });
  const saveNameDebounced = debounce(async () => {
    try {
      await api.renameProfile(profileId, nameField.value.trim());
      toast('השם עודכן', 'success');
      ctx.onProfileRenamed?.(profileId, nameField.value.trim());
    } catch (e) { reportError(e); }
  }, 700);
  nameField.addEventListener('input', saveNameDebounced);

  container.appendChild(card('שם הפרופיל', 'השם מוצג בלוח הבקרה וב-NextDNS', el('div', { class: 'field' }, [nameField])));

  // --- מזהה פרופיל + חיבור מהיר ---
  const idBox = el('div', { class: 'setup-box' }, [
    el('span', {}, profileId),
    el('button', { class: 'btn btn--ghost btn--sm', onclick: () => copyToClipboard(profileId) }, 'העתק'),
  ]);
  container.appendChild(card('מזהה הפרופיל (Configuration ID)', 'משמש להגדרת DNS במכשירים - ראו בטאב "מכשירים"', idBox));

  // --- אזור מסוכן ---
  const dangerBody = el('div', {}, [
    el('p', { style: 'color:var(--text-dim);font-size:13px;margin:0 0 12px' }, 'מחיקת הפרופיל תסיר את כל ההגדרות, הרשימות והמכשירים המקושרים אליו לצמיתות ב-NextDNS.'),
    el('button', {
      class: 'btn btn--danger btn--sm',
      onclick: async () => {
        const ok = await confirmModal({
          title: 'מחיקת פרופיל',
          body: `האם למחוק לצמיתות את הפרופיל <b>${profile.name || profileId}</b>? הפעולה בלתי הפיכה.`,
          confirmLabel: 'מחק פרופיל',
          danger: true,
        });
        if (!ok) return;
        try {
          await api.deleteProfile(profileId);
          toast('הפרופיל נמחק', 'success');
          ctx.onProfileDeleted?.(profileId);
        } catch (e) { reportError(e); }
      },
    }, '🗑️ מחק פרופיל'),
  ]);
  container.appendChild(card('אזור מסוכן', '', dangerBody, 'card--danger'));
}
