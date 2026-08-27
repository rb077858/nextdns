// מיפוי קוסמטי בלבד: הופך מזהי API (למשל "tiktok") לשם תצוגה ואמוג'י נעים.
// זהו שכבת תצוגה בלבד - כל הלוגיקה מסתמכת על ה-id המקורי שמגיע מה-API,
// כך שגם קטגוריה/שירות שלא מופיעים כאן יוצגו בצורה תקינה (עם השם הגולמי בעברית-לועזית).

export const CATEGORY_LABELS = {
  dating: { name: 'אתרי היכרויות', icon: '💘' },
  gambling: { name: 'הימורים', icon: '🎰' },
  gaming: { name: 'משחקים', icon: '🎮' },
  piracy: { name: 'פיראטיות והורדות', icon: '🏴‍☠️' },
  porn: { name: 'תוכן למבוגרים', icon: '🔞' },
  'social-networks': { name: 'רשתות חברתיות', icon: '💬' },
  'video-streaming': { name: 'סטרימינג ווידאו', icon: '📺' },
};

export const SERVICE_LABELS = {
  '9gag': { name: '9GAG', icon: '😂' },
  'amazon': { name: 'Amazon', icon: '📦' },
  'appstore': { name: 'App Store', icon: '📱' },
  'battlenet': { name: 'Battle.net', icon: '🎮' },
  'bereal': { name: 'BeReal', icon: '📸' },
  'bigo-live': { name: 'Bigo Live', icon: '🔴' },
  'chatgpt': { name: 'ChatGPT', icon: '🤖' },
  'clubhouse': { name: 'Clubhouse', icon: '🎙️' },
  'coinbase': { name: 'Coinbase', icon: '🪙' },
  'crunchyroll': { name: 'Crunchyroll', icon: '📺' },
  'dailymotion': { name: 'Dailymotion', icon: '🎬' },
  'deezer': { name: 'Deezer', icon: '🎵' },
  'discord': { name: 'Discord', icon: '🕹️' },
  'disneyplus': { name: 'Disney+', icon: '🏰' },
  'ebay': { name: 'eBay', icon: '🛒' },
  'epic-games': { name: 'Epic Games', icon: '🎮' },
  'facebook': { name: 'Facebook', icon: '📘' },
  'fortnite': { name: 'Fortnite', icon: '🔫' },
  'hbomax': { name: 'HBO Max', icon: '🎬' },
  'hulu': { name: 'Hulu', icon: '📺' },
  'imgur': { name: 'Imgur', icon: '🖼️' },
  'instagram': { name: 'Instagram', icon: '📷' },
  'league-of-legends': { name: 'League of Legends', icon: '⚔️' },
  'linkedin': { name: 'LinkedIn', icon: '💼' },
  'messenger': { name: 'Messenger', icon: '💬' },
  'minecraft': { name: 'Minecraft', icon: '🧱' },
  'netflix': { name: 'Netflix', icon: '🎬' },
  'nintendo': { name: 'Nintendo', icon: '🎮' },
  'onlyfans': { name: 'OnlyFans', icon: '🔞' },
  'paramountplus': { name: 'Paramount+', icon: '📺' },
  'pinterest': { name: 'Pinterest', icon: '📌' },
  'playstation-network': { name: 'PlayStation Network', icon: '🎮' },
  'primevideo': { name: 'Prime Video', icon: '🎬' },
  'quora': { name: 'Quora', icon: '❓' },
  'reddit': { name: 'Reddit', icon: '👽' },
  'roblox': { name: 'Roblox', icon: '🧩' },
  'signal': { name: 'Signal', icon: '🔒' },
  'skype': { name: 'Skype', icon: '📞' },
  'snapchat': { name: 'Snapchat', icon: '👻' },
  'spotify': { name: 'Spotify', icon: '🎵' },
  'steam': { name: 'Steam', icon: '🎮' },
  'telegram': { name: 'Telegram', icon: '✈️' },
  'tiktok': { name: 'TikTok', icon: '🎵' },
  'tinder': { name: 'Tinder', icon: '🔥' },
  'tumblr': { name: 'Tumblr', icon: '📓' },
  'twitch': { name: 'Twitch', icon: '🎥' },
  'twitter': { name: 'X (Twitter)', icon: '🐦' },
  'uber': { name: 'Uber', icon: '🚗' },
  'valorant': { name: 'Valorant', icon: '🎯' },
  'viber': { name: 'Viber', icon: '📞' },
  'vimeo': { name: 'Vimeo', icon: '🎬' },
  'vk': { name: 'VK', icon: '💬' },
  'wechat': { name: 'WeChat', icon: '💬' },
  'whatsapp': { name: 'WhatsApp', icon: '💬' },
  'xbox-live': { name: 'Xbox Live', icon: '🎮' },
  'youtube': { name: 'YouTube', icon: '▶️' },
  'youtubekids': { name: 'YouTube Kids', icon: '▶️' },
  'zoom': { name: 'Zoom', icon: '📹' },
};

export function prettify(id) {
  return id
    .split(/[-_]/g)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function categoryLabel(id) {
  const l = CATEGORY_LABELS[id];
  return l ? `${l.icon} ${l.name}` : `🏷️ ${prettify(id)}`;
}

export function serviceLabel(id) {
  const l = SERVICE_LABELS[id];
  return l ? `${l.icon} ${l.name}` : `📦 ${prettify(id)}`;
}
