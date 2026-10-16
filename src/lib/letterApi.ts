// Letter API - Handles guest anonymous letter submission and recipient inbox operations

import { getSupabaseClient, getSupabaseCredentials } from './supabase';
import type { Message, MessageCategory, Profile, ReportPayload, SubmitAnonymousPayload, SubmitAnonymousResult } from '../types/database';

// Compute a client hash for guest rate limiting without collecting personal identity
async function getClientHash(): Promise<string> {
  try {
    const rawData = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().toDateString()
    ].join('|');
    
    const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawData));
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .substring(0, 24);
  } catch {
    return 'fallback_hash_' + Math.floor(Math.random() * 100000);
  }
}

// Fallback demo letterbox when no Supabase credentials are configured
export const DEMO_PROFILES: Record<string, Profile> = {
  anirban: {
    id: 'demo-anirban-id',
    username: 'anirban',
    display_name: 'অনির্বাণ মুখোপাধ্যায়',
    avatar_url: null,
    prompt: 'আমাকে তোমার গোপন মনের কথা বলো... 🤫',
    bio: 'সাহিত্য, কবিতা ও না-বলা কথার চিঠি বাক্স',
    inbox_paused: false,
    is_banned: false,
    role: 'user',
    envelope_theme: 'vintage_burgundy',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date().toISOString()
  },
  priya: {
    id: 'demo-priya-id',
    username: 'priya',
    display_name: 'প্রিয়া সেনগুপ্ত',
    avatar_url: null,
    prompt: 'কোনো মধুর স্মৃতি বা মিষ্টি প্রশংসা পাঠাতে পারো ✨',
    bio: 'চা এবং বৃষ্টির দিনে বেনামী চিঠির অপেক্ষা...',
    inbox_paused: false,
    is_banned: false,
    role: 'user',
    envelope_theme: 'emerald_green',
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    updated_at: new Date().toISOString()
  },
  tashfeen: {
    id: 'demo-tashfeen-id',
    username: 'tashfeen',
    display_name: 'তাশফীন রহমান',
    avatar_url: null,
    prompt: 'কোনো অভিযোগ বা গোপন কথা থাকলে নিঃসংকোচে লিখুন 📬',
    bio: 'সরাসরি বলতে লজ্জা লাগলে এখানে লিখে দিন',
    inbox_paused: true, // For testing paused inbox!
    is_banned: false,
    role: 'user',
    envelope_theme: 'vintage_burgundy',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date().toISOString()
  }
};

// In-memory messages for offline demo review when Supabase is not configured
let localMockMessages: Message[] = [
  {
    id: 'msg-demo-1',
    recipient_id: 'demo-anirban-id',
    category: 'secret',
    content: 'তোমার লেখার হাত অসাধারণ! কলেজে দূর থেকে তোমার আবৃত্তি শুনতাম, কিন্তু কখনো সামনে গিয়ে বলার সাহস হয়নি। ভালো থেকো।',
    reaction: '❤️',
    reply_text: 'অসংখ্য ধন্যবাদ এমন সুন্দর একটি স্মৃতির জন্য! জানতে পারলে খুব খুশি হতাম কে তুমি।',
    replied_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    is_read: true,
    is_favorite: true,
    is_archived: false,
    created_at: new Date(Date.now() - 3600000 * 4).toISOString()
  },
  {
    id: 'msg-demo-2',
    recipient_id: 'demo-anirban-id',
    category: 'compliment',
    content: 'তোমার হাসিটায় এক অদ্ভুত মায়া আছে, সারা দিনের ক্লান্তি মুছে যায়!',
    reaction: '🌸',
    reply_text: null,
    replied_at: null,
    is_read: false,
    is_favorite: false,
    is_archived: false,
    created_at: new Date(Date.now() - 1800000).toISOString()
  }
];

// Local persistent storage keys
const STORAGE_PROFILES_KEY = 'chupichupi_local_profiles';
const STORAGE_MESSAGES_KEY = 'chupichupi_local_messages';

export function getLocalProfiles(): Record<string, Profile> {
  if (typeof window === 'undefined') return { ...DEMO_PROFILES };
  try {
    const raw = localStorage.getItem(STORAGE_PROFILES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEMO_PROFILES, ...parsed };
    }
  } catch {
    // ignore
  }
  return { ...DEMO_PROFILES };
}

export function saveLocalProfile(profile: Profile): void {
  DEMO_PROFILES[profile.username.toLowerCase()] = profile;
  if (typeof window === 'undefined') return;
  try {
    const profiles = getLocalProfiles();
    profiles[profile.username.toLowerCase()] = profile;
    localStorage.setItem(STORAGE_PROFILES_KEY, JSON.stringify(profiles));
  } catch {
    // ignore
  }
}

export function getLocalMessages(): Message[] {
  if (typeof window === 'undefined') return [...localMockMessages];
  try {
    const raw = localStorage.getItem(STORAGE_MESSAGES_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return [...localMockMessages];
}

export function saveLocalMessages(messages: Message[]): void {
  localMockMessages = [...messages];
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(messages));
  } catch {
    // ignore
  }
}

/**
 * Fetch a recipient's public profile by username (Case-insensitive)
 */
export async function getPublicProfile(username: string): Promise<{ profile: Profile | null; isRealBackend: boolean; error?: string }> {
  const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
  const client = getSupabaseClient();

  if (client) {
    try {
      const { data, error } = await client
        .from('profiles')
        .select('id, username, display_name, avatar_url, prompt, bio, inbox_paused, is_banned, role, envelope_theme, created_at, updated_at')
        .ilike('username', cleanUsername)
        .maybeSingle();

      if (!error && data) {
        if (data.is_banned) {
          return { profile: null, isRealBackend: true, error: 'এই অ্যাকাউন্টটি স্থগিত রাখা হয়েছে (This account is suspended)' };
        }
        return { profile: data as Profile, isRealBackend: true };
      }
    } catch {
      // Fallback to local
    }
  }

  // Check persistent local profiles
  const profiles = getLocalProfiles();
  const found = profiles[cleanUsername];
  if (found) {
    if (found.is_banned) {
      return { profile: null, isRealBackend: false, error: 'এই অ্যাকাউন্টটি স্থগিত রাখা হয়েছে।' };
    }
    return { profile: found, isRealBackend: false };
  }

  // Cross-device / mobile seamless resolution:
  // When opened on mobile via WhatsApp or social links, dynamically initialize the recipient letterbox
  const cleanUser = cleanUsername.replace(/^@/, '').trim();
  if (cleanUser && cleanUser.length >= 2 && !cleanUser.includes('ghost_user')) {
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const urlName = searchParams?.get('name');
    const urlPrompt = searchParams?.get('p');

    const dynamicProfile: Profile = {
      id: `usr_${cleanUser}`,
      username: cleanUser,
      display_name: urlName || (cleanUser.charAt(0).toUpperCase() + cleanUser.slice(1)),
      avatar_url: null,
      prompt: urlPrompt || 'আমাকে তোমার গোপন মনের কথা বলো... 🤫',
      bio: 'বেনামী চিঠি পাঠানোর চিঠি বাক্স',
      inbox_paused: false,
      is_banned: false,
      role: 'user',
      envelope_theme: 'vintage_burgundy',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    saveLocalProfile(dynamicProfile);
    return { profile: dynamicProfile, isRealBackend: false };
  }

  return { profile: null, isRealBackend: false, error: 'প্রাপকের চিঠি বাক্স খুঁজে পাওয়া যায়নি। অনুগ্রহ করে সঠিক ইউজারনেম পরীক্ষা করুন।' };
}

/**
 * Guest-First Anonymous Message Submission
 * Validates message, checks recipient status, and safely inserts to Supabase
 */
export async function sendAnonymousLetter(payload: SubmitAnonymousPayload): Promise<SubmitAnonymousResult> {
  const content = (payload.content || '').trim();
  const username = (payload.recipient_username || '').trim().toLowerCase().replace(/^@/, '');
  const category = payload.category;

  // Strict client-side validation
  if (!username) {
    return { success: false, error: 'প্রাপকের নাম উল্লেখ করা আবশ্যক (Recipient username is required).' };
  }

  if (!content) {
    return { success: false, error: 'চিঠি ফাঁকা রাখা যাবে না (Letter content cannot be empty).' };
  }

  if (content.length > 1000) {
    return { success: false, error: `চিঠির দৈর্ঘ্য সর্বোচ্চ ১০০০ অক্ষর হতে পারে (বর্তমান: ${content.length})।` };
  }

  const validCategories: MessageCategory[] = ['secret', 'confession', 'compliment', 'fun', 'advice', 'friendship', 'other'];
  if (!validCategories.includes(category)) {
    return { success: false, error: 'অবৈধ চিঠির বিভাগ নির্বাচন করা হয়েছে।' };
  }

  const client = getSupabaseClient();
  const { isConfigured } = getSupabaseCredentials();

  // If Supabase is connected, execute real backend submission!
  if (isConfigured && client) {
    try {
      const clientHash = payload.client_hash || await getClientHash();

      // Call secure database RPC
      const { data, error } = await client.rpc('submit_anonymous_message', {
        p_recipient_username: username,
        p_category: category,
        p_content: content,
        p_client_hash: clientHash,
        p_user_agent_hash: clientHash
      });

      if (error) {
        // Fallback to direct insertion into public.messages if RPC function is missing or errored
        try {
          const { data: recipient } = await client
            .from('profiles')
            .select('id, username, inbox_paused')
            .ilike('username', username)
            .maybeSingle();

          if (recipient) {
            if (recipient.inbox_paused) {
              return { success: false, error: 'এই চিঠি বাক্সটি বর্তমানে সাময়িকভাবে বন্ধ আছে (Letterbox paused).' };
            }
            const { data: insertedMsg, error: insertErr } = await client
              .from('messages')
              .insert({
                recipient_id: recipient.id,
                category,
                content
              })
              .select('id, created_at')
              .maybeSingle();

            if (!insertErr && insertedMsg) {
              return {
                success: true,
                message_id: insertedMsg.id,
                recipient_username: recipient.username,
                delivered_at: insertedMsg.created_at
              };
            }
          }
        } catch {
          // ignore fallback error and report main error
        }
        return { success: false, error: error.message };
      }

      if (data && data.success === false) {
        return { success: false, error: data.error || 'চিঠি পাঠাতে ব্যর্থ হয়েছে।' };
      }

      return {
        success: true,
        message_id: data.message_id,
        recipient_username: data.recipient_username || username,
        delivered_at: data.delivered_at || new Date().toISOString()
      };
    } catch {
      return { success: false, error: 'চিঠি পাঠাতে সাময়িক সমস্যা হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।' };
    }
  }

  // Fallback recipient resolution from local persistent profiles
  const profiles = getLocalProfiles();
  const targetProfile = profiles[username];
  if (!targetProfile) {
    return { 
      success: false, 
      error: 'এই ইউজারনেমে কোনো চিঠি বাক্স পাওয়া যায়নি। অনুগ্রহ করে সঠিক ইউজারনেম পরীক্ষা করুন।' 
    };
  }

  if (targetProfile.inbox_paused) {
    return { 
      success: false, 
      error: 'এই চিঠি বাক্সটি বর্তমানে সাময়িকভাবে বন্ধ আছে (This letterbox is paused).' 
    };
  }

  const newDemoMessage: Message = {
    id: 'msg-local-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    recipient_id: targetProfile.id,
    category,
    content,
    is_read: false,
    is_favorite: false,
    is_archived: false,
    created_at: new Date().toISOString()
  };

  const msgs = getLocalMessages();
  msgs.unshift(newDemoMessage);
  saveLocalMessages(msgs);

  return {
    success: true,
    message_id: newDemoMessage.id,
    recipient_username: username,
    delivered_at: newDemoMessage.created_at
  };
}

/**
 * Fetch recipient's inbox messages (Protected by RLS and backed by secure RPC)
 */
export async function getInboxMessages(
  recipientId: string, 
  username?: string
): Promise<{ messages: Message[]; isRealBackend: boolean; error?: string }> {
  const client = getSupabaseClient();
  let supabaseMessages: Message[] = [];

  if (client) {
    try {
      // 1. Try secure fetch_inbox_messages_v2 which matches by BOTH UUID and profile username
      const { data: rpcV2Data, error: rpcV2Error } = await client.rpc('fetch_inbox_messages_v2', {
        p_recipient_id: recipientId,
        p_username: username || null
      });

      if (!rpcV2Error && rpcV2Data && Array.isArray(rpcV2Data)) {
        supabaseMessages = rpcV2Data as Message[];
      } else {
        // 2. Try classic RPC
        const { data: rpcData, error: rpcError } = await client.rpc('fetch_inbox_messages', {
          p_recipient_id: recipientId
        });

        if (!rpcError && rpcData && Array.isArray(rpcData)) {
          supabaseMessages = rpcData as Message[];
        } else {
          // 3. Direct table select fallback
          const { data, error } = await client
            .from('messages')
            .select('*')
            .eq('recipient_id', recipientId)
            .order('created_at', { ascending: false });

          if (!error && data) {
            supabaseMessages = data as Message[];
          }
        }
      }
    } catch {
      // ignore
    }
  }

  const cleanUser = username?.toLowerCase().replace(/^@/, '');
  const localMsgs = getLocalMessages().filter(
    m => m.recipient_id === recipientId || (cleanUser && m.recipient_id === `usr_${cleanUser}`)
  );
  const combined = [...supabaseMessages, ...localMsgs];
  const map = new Map<string, Message>();
  for (const m of combined) {
    map.set(m.id, m);
  }
  const uniqueMessages = Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return { messages: uniqueMessages, isRealBackend: supabaseMessages.length > 0 };
}

/**
 * Update message status (Read, Favorite, Reaction, Reply)
 */
export async function updateMessage(messageId: string, updates: Partial<Message>): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();

  if (client) {
    try {
      await client
        .from('messages')
        .update(updates)
        .eq('id', messageId);
    } catch {
      // ignore
    }
  }

  const msgs = getLocalMessages().map(m => m.id === messageId ? { ...m, ...updates } : m);
  saveLocalMessages(msgs);
  return { success: true };
}

/**
 * Delete a message from the recipient's inbox
 */
export async function deleteMessage(messageId: string): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();

  if (client) {
    try {
      await client
        .from('messages')
        .delete()
        .eq('id', messageId);
    } catch {
      // ignore
    }
  }

  const msgs = getLocalMessages().filter(m => m.id !== messageId);
  saveLocalMessages(msgs);
  return { success: true };
}

/**
 * Submit an abuse report
 */
export async function reportMessage(payload: ReportPayload): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();

  if (client) {
    try {
      const { error } = await client
        .from('reports')
        .insert({
          message_id: payload.message_id,
          reason: payload.reason,
          details: payload.details || null
        });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  return { success: true };
}

/**
 * Update Profile & Inbox Settings (Pause inbox, change prompt, bio, etc.)
 */
export async function updateProfileSettings(
  userId: string, 
  settings: Partial<Pick<Profile, 'display_name' | 'prompt' | 'bio' | 'inbox_paused' | 'envelope_theme'>>
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();

  if (client) {
    try {
      const { error } = await client
        .from('profiles')
        .update({
          ...settings,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // Local profile settings persistence
  const profiles = getLocalProfiles();
  for (const k of Object.keys(profiles)) {
    if (profiles[k].id === userId) {
      profiles[k] = { ...profiles[k], ...settings, updated_at: new Date().toISOString() };
      saveLocalProfile(profiles[k]);
      break;
    }
  }
  return { success: true };
}
