import { el, reportError, toast } from '../util.js';
import { card, spinner, emptyState, statCard, confirmModal } from '../components.js';

export async function render(container, ctx) {
  const { api, profileId } = ctx;
  container.appendChild(spinner());

  let domains = [], status = null;
  try { domains = await api.getAnalyticsDomains(profileId); } catch { domains = []; }
  try { status = await api.getAnalyticsStatus(profileId); } catch { status = null; }

  container.innerHTML = '';

  if (status && Array.isArray(status)) {
    const map = Object.fromEntries(status.map((s) => [s.status || s.id, s.queries]));
    container.appendChild(el('div', { class: 'grid-cards', style: 'margin-bottom:18px' }, [
      statCard('✅ שאילתות שהותרו', (map.default || 0) + (map.allowed || 0)),
      statCard('⛔ שאילתות שנחסמו', map.blocked || 0),
      statCard('📦 סה"כ', Object.values(map).reduce((a, b) => a + (b || 0), 0)),
    ]));
  }

  const domainsWrap = el('div', {});
  if (!domains || !domains.length) {
    domainsWrap.appendChild(emptyState('אין עדיין נתוני פעילות להצגה'));
  } else {
    domains.slice(0, 20).forEach((d) => {
      domainsWrap.appendChild(el('div', { class: 'list-row' }, [
        el('span', { class: 'list-row__domain' }, d.domain || d.root || d.id),
        el('span', { class: `badge ${d.blocked ? 'badge--red' : 'badge--green'}` }, d.blocked ? 'נחסם' : 'הותר'),
        el('span', { style: 'color:var(--text-dim);font-size:13px' }, `${(d.queries || 0).toLocaleString('he')} שאילתות`),
      ]));
    });
  }
  container.appendChild(card('🌐 האתרים הפעילים ביותר', 'תמצית מהימים האחרונים', domainsWrap));

  const clearBody = el('div', {}, [
    el('p', { style: 'font-size:13px;color:var(--text-dim);margin:0 0 12px' }, 'מחיקת היומן תסיר את כל היסטוריית השאילתות שנשמרה עבור פרופיל זה. הפעולה בלתי הפיכה.'),
    el('button', { class: 'btn btn--danger btn--sm', onclick: async () => {
      const ok = await confirmModal({ title: 'ניקוי יומן', body: 'למחוק את כל היסטוריית היומן של הפרופיל הזה?', confirmLabel: 'נקה יומן', danger: true });
      if (!ok) return;
      try { await api.clearLogs(profileId); toast('היומן נוקה', 'success'); }
      catch (e) { reportError(e); }
    } }, '🧹 נקה יומן'),
    el('a', { href: `https://my.nextdns.io/${profileId}/logs`, target: '_blank', rel: 'noopener', class: 'link-btn', style: 'display:block;margin-top:14px' }, 'צפייה ביומן המלא בזמן אמת באתר NextDNS ↗'),
  ]);
  container.appendChild(card('🧹 ניהול יומן', '', clearBody));
}
