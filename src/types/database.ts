// Types for ChupiChupi (চুপিচুপি)

export type MessageCategory = 
  | 'secret'       // গোপন কথা
  | 'confession'   // মনের অনুভূতি
  | 'compliment'   // মিষ্টি প্রশংসা
  | 'fun'          // মজার কথা
  | 'advice'       // পরামর্শ
  | 'friendship'   // বন্ধুত্বের কথা
  | 'other';       // অন্যান্য

export interface CategoryInfo {
  id: MessageCategory;
  labelBn: string;
  labelEn: string;
  icon: string;
  badgeBg: string;
  badgeColor: string;
  descriptionBn: string;
}

export const CATEGORIES: Record<MessageCategory, CategoryInfo> = {
  secret: {
    id: 'secret',
    labelBn: 'গোপন কথা',
    labelEn: 'Secret',
    icon: '🤫',
    badgeBg: 'rgba(153, 27, 27, 0.15)',
    badgeColor: '#ef4444',
    descriptionBn: 'গোপনে এমন কিছু যা কখনো বলা হয়নি'
  },
  confession: {
    id: 'confession',
    labelBn: 'মনের অনুভূতি',
    labelEn: 'Confession',
    icon: '💖',
    badgeBg: 'rgba(219, 39, 119, 0.15)',
    badgeColor: '#ec4899',
    descriptionBn: 'হৃদয়ের গভীর থেকে অপ্রকাশিত ভালোবাসা বা অনুভূতি'
  },
  compliment: {
    id: 'compliment',
    labelBn: 'মিষ্টি প্রশংসা',
    labelEn: 'Compliment',
    icon: '✨',
    badgeBg: 'rgba(217, 119, 6, 0.15)',
    badgeColor: '#f59e0b',
    descriptionBn: 'একটি মিষ্টি কথা যা ওনার মুখে হাসি ফোটাবে'
  },
  fun: {
    id: 'fun',
    labelBn: 'মজার কথা',
    labelEn: 'Fun / Tease',
    icon: '😂',
    badgeBg: 'rgba(124, 58, 237, 0.15)',
    badgeColor: '#a855f7',
    descriptionBn: 'হাসির কোনো স্মৃতি বা হালকা খুনসুটি'
  },
  advice: {
    id: 'advice',
    labelBn: 'সদুপদেশ',
    labelEn: 'Advice',
    icon: '💡',
    badgeBg: 'rgba(13, 148, 136, 0.15)',
    badgeColor: '#14b8a6',
    descriptionBn: 'উপকারী কোনো জীবন বা কাজের পরামর্শ'
  },
  friendship: {
    id: 'friendship',
    labelBn: 'বন্ধুত্বের বার্তা',
    labelEn: 'Friendship',
    icon: '🤝',
    badgeBg: 'rgba(37, 99, 235, 0.15)',
    badgeColor: '#3b82f6',
    descriptionBn: 'বন্ধুত্বের টান ও স্নেহের স্মারক'
  },
  other: {
    id: 'other',
    labelBn: 'অন্যান্য চিঠি',
    labelEn: 'Other',
    icon: '💌',
    badgeBg: 'rgba(107, 114, 128, 0.15)',
    badgeColor: '#9ca3af',
    descriptionBn: 'যে কোনো বার্তা যা লিখতে ইচ্ছা করে'
  }
};

export interface Profile {
  id: string;
  email?: string | null;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  prompt: string;
  bio: string;
  inbox_paused: boolean;
  is_banned: boolean;
  role: 'user' | 'moderator' | 'admin';
  envelope_theme?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  recipient_id: string;
  category: MessageCategory;
  content: string;
  reaction?: string | null;
  reply_text?: string | null;
  replied_at?: string | null;
  is_read: boolean;
  is_favorite: boolean;
  is_archived: boolean;
  created_at: string;
}

export interface ReportPayload {
  message_id: string;
  reason: 'harassment' | 'hate_speech' | 'spam' | 'threat' | 'inappropriate' | 'other';
  details?: string;
}

export interface SubmitAnonymousPayload {
  recipient_username: string;
  category: MessageCategory;
  content: string;
  client_hash?: string;
}

export interface SubmitAnonymousResult {
  success: boolean;
  message_id?: string;
  recipient_username?: string;
  delivered_at?: string;
  error?: string;
}
