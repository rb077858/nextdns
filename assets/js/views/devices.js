import { el, reportError, toast, copyToClipboard } from '../util.js';
import { card, spinner, emptyState, hintBanner } from '../components.js';

const DEVICE_ICONS = { router: '📡', mobile: '📱', desktop: '🖥️', laptop: '💻', unknown: '❓' };

export async function render(container, ctx) {
  const { api, profileId } = ctx;
  container.appendChild(spinner());

  let devices = [];
  let setup = null;
  try {
    devices = await api.getAnalyticsDevices(profileId).catch(() => []);
  } catch { /* ignore */ }
  try { setup = await api.getSetup(profileId); } catch { setup = null; }

  container.innerHTML = '';

  // --- מכשירים פעילים ---
  const devWrap = el('div', {});
  if (!devices || !devices.length) {
    devWrap.appendChild(emptyState('עדיין לא זוהו מכשירים בפרופיל זה. חברו מכשיר לפי ההוראות למטה ורעננו את הדף.'));
  } else {
    devices.forEach((d) => {
      devWrap.appendChild(el('div', { class: 'device-row' }, [
        el('span', { class: 'device-row__icon' }, DEVICE_ICONS[d.model?.toLowerCase()] || DEVICE_ICONS.unknown),
        el('div', {}, [
          el('div', { class: 'device-row__name' }, d.name || d.id || 'מכשיר לא מזוהה'),
          el('div', { class: 'device-row__meta' }, [d.model, d.localIp].filter(Boolean).join(' · ')),
        ]),
        el('span', { class: 'device-row__count' }, d.queries ? `${d.queries.toLocaleString('he')} שאילתות` : ''),
      ]));
    });
  }
  container.appendChild(card('💻 מכשירים שזוהו', 'מבוסס על תעבורת DNS בפועל בימים האחרונים', devWrap));

  // --- הגדרת מכשירים חדשים ---
  const dohUrl = `https://dns.nextdns.io/${profileId}`;
  const dotHost = `${profileId}.dns.nextdns.io`;

  const setupWrap = el('div', {});
  setupWrap.appendChild(hintBanner('כדי לזהות כל מכשיר בנפרד ולתת לו שם, הוסיפו <code>/מזהה-מכשיר</code> לסוף כתובת ה-DoH (למשל <code>...' + profileId + '/iphone-של-דני</code>).'));

  setupWrap.appendChild(setupRow('DNS-over-HTTPS (מומלץ - iOS, Android, Windows, דפדפנים)', dohUrl));
  setupWrap.appendChild(setupRow('DNS-over-TLS (ראוטרים תומכים, Android)', dotHost));

  if (setup?.ipv4?.length) {
    setup.ipv4.forEach((ip) => setupWrap.appendChild(setupRow('כתובת IPv4 (לאחר קישור IP בביתך)', ip)));
  }
  if (setup?.ipv6?.length) {
    setup.ipv6.forEach((ip) => setupWrap.appendChild(setupRow('כתובת IPv6', ip)));
  }

  setupWrap.appendChild(el('p', { style: 'font-size:12.5px;color:var(--text-dim);margin-top:10px;line-height:1.7' },
    'להגדרה קלה יותר: התקינו את אפליקציית NextDNS הרשמית במכשיר או בראוטר והזינו את מזהה הפרופיל שמופיע בטאב "סקירה כללית".'));

  container.appendChild(card('🔧 חיבור מכשיר חדש', 'הגדירו את הפרופיל הזה כ-DNS במכשיר (טלפון, מחשב או ראוטר)', setupWrap));

  // --- אין בקרת זמן פר-מכשיר ---
  container.appendChild(card(
    '⏱️ הגבלת זמן למכשיר בודד',
    '',
    hintBanner('ל-NextDNS אין כרגע תמיכה ב"זמן מסך" נפרד לכל מכשיר בתוך אותו פרופיל - הגבלות בקרת ההורים ולוח הזמנים חלים על <b>כל</b> המכשירים המחוברים לפרופיל יחד. הפתרון המומלץ: ליצור <b>פרופיל נפרד לכל ילד/מכשיר</b> (בעמוד "הפרופילים שלי" בסרגל הצד) ולחבר את המכשיר שלו לפרופיל הייעודי. כך ניתן להגדיר לוחות זמנים וחסימות שונות לכל אחד.'),
  ));
}

function setupRow(label, value) {
  return el('div', { style: 'margin-bottom:12px' }, [
    el('div', { style: 'font-size:12.5px;color:var(--text-dim);margin-bottom:4px;font-weight:600' }, label),
    el('div', { class: 'setup-box' }, [
      el('span', { style: 'overflow-wrap:anywhere' }, value),
      el('button', { class: 'btn btn--ghost btn--sm', onclick: () => copyToClipboard(value) }, 'העתק'),
    ]),
  ]);
}
