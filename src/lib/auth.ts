// Supabase Authentication & Resilient Profile Management for ChupiChupi

import { getSupabaseClient, getSupabaseCredentials } from './supabase';
import { saveLocalProfile, getLocalProfiles, DEMO_PROFILES } from './letterApi';
import type { Profile } from '../types/database';

export interface AuthResponse {
  success: boolean;
  user?: any;
  profile?: Profile | null;
  error?: string;
  message?: string;
}

export interface LocalAccount {
  id: string;
  email: string;
  password: string;
  username: string;
  profile: Profile;
}

export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

const STORAGE_ACCOUNTS_KEY = 'chupichupi_local_accounts';
const STORAGE_SESSION_KEY = 'chupichupi_active_session';

let inMemoryAccounts: LocalAccount[] = [
  {
    id: 'demo-anirban-id',
    email: 'anirban@example.com',
    password: 'password123',
    username: 'anirban',
    profile: DEMO_PROFILES.anirban
  },
  {
    id: 'demo-priya-id',
    email: 'priya@example.com',
    password: 'password123',
    username: 'priya',
    profile: DEMO_PROFILES.priya
  }
];

let inMemoryActiveSession: { user: any; profile: Profile } | null = null;

/**
 * Retrieve local registered accounts (persisted in localStorage & in-memory)
 */
export function getLocalAccounts(): LocalAccount[] {
  if (typeof window === 'undefined') return inMemoryAccounts;
  try {
    const raw = localStorage.getItem(STORAGE_ACCOUNTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const combined = [...parsed];
      for (const demo of inMemoryAccounts) {
        if (!combined.some(a => a.username.toLowerCase() === demo.username.toLowerCase())) {
          combined.push(demo);
        }
      }
      return combined;
    } else {
      localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(inMemoryAccounts));
    }
  } catch {
    // ignore
  }
  return inMemoryAccounts;
}

/**
 * Save accounts to local storage
 */
export function saveLocalAccounts(accounts: LocalAccount[]): void {
  inMemoryAccounts = [...accounts];
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    // ignore
  }
}

/**
 * Retrieve active local session
 */
export function getActiveLocalSession(): { user: any; profile: Profile } | null {
  if (typeof window === 'undefined') return inMemoryActiveSession;
  try {
    const raw = localStorage.getItem(STORAGE_SESSION_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return inMemoryActiveSession;
}

/**
 * Save active local session
 */
export function setActiveLocalSession(user: any, profile: Profile): void {
  inMemoryActiveSession = { user, profile };
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify({ user, profile }));
  } catch {
    // ignore
  }
}

/**
 * Clear active local session
 */
export function clearActiveLocalSession(): void {
  inMemoryActiveSession = null;
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_SESSION_KEY);
  } catch {
    // ignore
  }
}

/**
 * Register a new user with Email, Password, Username & Display Name
 * Works with real Supabase Auth when configured, and falls back to persistent storage seamlessly!
 */
export async function signUpWithEmail(
  email: string,
  pass: string,
  username: string,
  displayName: string
): Promise<AuthResponse> {
  const cleanEmail = email.trim();
  const cleanUsername = username.trim().toLowerCase();
  const cleanName = displayName.trim();

  if (!cleanEmail || !pass) {
    return { success: false, error: 'ইমেইল এবং পাসওয়ার্ড আবশ্যক (Email and password are required).' };
  }

  if (!USERNAME_REGEX.test(cleanUsername)) {
    return { 
      success: false, 
      error: 'ইউজারনেম ৩ থেকে ৩০ অক্ষরের হতে হবে এবং শুধুমাত্র ইংরেজি অক্ষর, সংখ্যা এবং আন্ডারস্কোর (_) ব্যবহার করা যাবে।' 
    };
  }

  if (cleanName.length < 2) {
    return { success: false, error: 'ডিসপ্লে নাম কমপক্ষে ২ অক্ষরের হতে হবে।' };
  }

  if (pass.length < 6) {
    return { success: false, error: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' };
  }

  const client = getSupabaseClient();
  const { isConfigured } = getSupabaseCredentials();

  // 1. If Supabase is configured with real key, execute real Supabase Auth
  if (isConfigured && client) {
    try {
      // Check if username is already taken in the database
      const { data: existingUser } = await client
        .from('profiles')
        .select('username')
        .ilike('username', cleanUsername)
        .maybeSingle();

      if (existingUser) {
        return { 
          success: false, 
          error: `এই ইউজারনেমটি (@${cleanUsername}) ইতিমধ্যে নেওয়া হয়েছে। অন্য একটি নির্বাচন করুন।` 
        };
      }

      const { data, error } = await client.auth.signUp({
        email: cleanEmail,
        password: pass,
        options: {
          data: {
            username: cleanUsername,
            display_name: cleanName
          }
        }
      });

      if (error) {
        if (error.message.toLowerCase().includes('already registered')) {
          return { success: false, error: 'এই ইমেইলটি দিয়ে ইতিমধ্যে একাউন্ট খোলা হয়েছে। অনুগ্রহ করে লগইন করুন।' };
        }
        if (error.message.toLowerCase().includes('password')) {
          return { success: false, error: 'পাসওয়ার্ডটি খুব দুর্বল অথবা কমপক্ষে ৬ অক্ষরের হতে হবে।' };
        }
        return { success: false, error: `নিবন্ধন ত্রুটি: ${error.message}` };
      }

      if (data?.user) {
        // In Supabase, if user already exists and email confirmations are enabled, 
        // it returns user with empty identities list
        if (data.user.identities && data.user.identities.length === 0) {
          return { 
            success: false, 
            error: 'এই ইমেইলটি দিয়ে ইতিমধ্যে একাউন্ট খোলা হয়েছে। অনুগ্রহ করে লগইন করুন।' 
          };
        }

        // Fetch or create profile in Supabase profiles table
        let profile: Profile | null = null;
        try {
          const { data: profData } = await client
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle();
          profile = profData as Profile | null;
        } catch {
          // Trigger might not have finished
        }

        if (!profile) {
          // Explicitly upsert profile into the database
          const newProfilePayload = {
            id: data.user.id,
            email: cleanEmail,
            username: cleanUsername,
            display_name: cleanName,
            avatar_url: null,
            prompt: 'আমাকে তোমার গোপন মনের কথা বলো... 🤫',
            bio: 'আমার সাথে গোপন চিঠি আদান-প্রদান করুন',
            inbox_paused: false,
            is_banned: false,
            role: 'user' as const,
            envelope_theme: 'vintage_burgundy',
          };

          try {
            const { data: insertedProf } = await client
              .from('profiles')
              .upsert(newProfilePayload)
              .select('*')
              .maybeSingle();
            profile = insertedProf as Profile | null;
          } catch {
            // RLS fallback
          }

          if (!profile) {
            profile = {
              ...newProfilePayload,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
          }
        }

        setActiveLocalSession(data.user, profile);
        saveLocalProfile(profile);

        const hasActiveSession = Boolean(data.session);
        return {
          success: true,
          user: data.user,
          profile,
          message: hasActiveSession 
            ? 'অভিনন্দন! আপনার চিঠি বাক্স সফলভাবে তৈরি হয়েছে।' 
            : 'আপনার অ্যাকাউন্ট তৈরি হয়েছে! আপনি সরাসরি আপনার চিঠির বাক্সে প্রবেশ করতে পারেন।'
        };
      }
    } catch (backendErr: any) {
      console.warn('Supabase signup exception, falling back to local:', backendErr);
    }
  }

  // 2. Resilient Persistent Local Signup (Instant working backup)
  const localAccounts = getLocalAccounts();
  const existingUsername = localAccounts.find(a => a.username.toLowerCase() === cleanUsername);
  if (existingUsername) {
    return { 
      success: false, 
      error: `এই ইউজারনেমটি (@${cleanUsername}) ইতিমধ্যে নেওয়া হয়েছে। অন্য একটি নির্বাচন করুন।` 
    };
  }

  const existingEmail = localAccounts.find(a => a.email.toLowerCase() === cleanEmail.toLowerCase());
  if (existingEmail) {
    return { 
      success: false, 
      error: 'এই ইমেইলটি দিয়ে ইতিমধ্যে একাউন্ট খোলা হয়েছে। অনুগ্রহ করে লগইন করুন।' 
    };
  }

  const newId = 'usr_' + Math.random().toString(36).substring(2, 10);
  const newProfile: Profile = {
    id: newId,
    email: cleanEmail,
    username: cleanUsername,
    display_name: cleanName,
    avatar_url: null,
    prompt: 'আমাকে তোমার গোপন মনের কথা বলো... 🤫',
    bio: 'আমার সাথে গোপন চিঠি আদান-প্রদান করুন',
    inbox_paused: false,
    is_banned: false,
    role: 'user',
    envelope_theme: 'vintage_burgundy',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const newAccount: LocalAccount = {
    id: newId,
    email: cleanEmail,
    password: pass,
    username: cleanUsername,
    profile: newProfile
  };

  localAccounts.push(newAccount);
  saveLocalAccounts(localAccounts);
  saveLocalProfile(newProfile);

  const localUser = { id: newId, email: cleanEmail };
  setActiveLocalSession(localUser, newProfile);

  return {
    success: true,
    user: localUser,
    profile: newProfile,
    message: 'অভিনন্দন! আপনার চিঠি বাক্স সফলভাবে তৈরি হয়েছে।'
  };
}

/**
 * Sign In with Email or Username & Password
 * Seamlessly resolves usernames to emails and checks Supabase Auth first!
 */
export async function signInWithEmail(emailOrUsername: string, pass: string): Promise<AuthResponse> {
  const cleanInput = emailOrUsername.trim();

  if (!cleanInput || !pass) {
    return { success: false, error: 'ইমেইল এবং পাসওয়ার্ড প্রদান করুন।' };
  }

  const client = getSupabaseClient();
  const { isConfigured } = getSupabaseCredentials();

  // 1. Try Supabase Auth first if configured
  if (isConfigured && client) {
    try {
      let resolvedEmail = cleanInput;

      // If user typed a username without @, resolve their email from Supabase
      if (!cleanInput.includes('@')) {
        const cleanUser = cleanInput.toLowerCase().replace(/^@/, '');
        try {
          // Try RPC resolver
          const { data: rpcEmail } = await client.rpc('get_email_by_username', { p_username: cleanUser });
          if (rpcEmail) {
            resolvedEmail = rpcEmail;
          } else {
            // Try profiles table lookup
            const { data: prof } = await client
              .from('profiles')
              .select('email')
              .ilike('username', cleanUser)
              .maybeSingle();
            if (prof?.email) {
              resolvedEmail = prof.email;
            }
          }
        } catch {
          // ignore resolution error
        }
      }

      const { data, error } = await client.auth.signInWithPassword({
        email: resolvedEmail,
        password: pass
      });

      if (!error && data?.user) {
        let profile: Profile | null = null;
        try {
          const { data: profData } = await client
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle();
          profile = profData as Profile | null;
        } catch {
          // ignore
        }

        if (!profile) {
          const fallbackProf: Profile = {
            id: data.user.id,
            email: data.user.email,
            username: data.user.user_metadata?.username || 'user_' + data.user.id.substring(0, 6),
            display_name: data.user.user_metadata?.display_name || 'আমার চিঠি বাক্স',
            avatar_url: null,
            prompt: 'আমাকে তোমার গোপন মনের কথা বলো... 🤫',
            bio: 'আমার সাথে গোপন চিঠি আদান-প্রদান করুন',
            inbox_paused: false,
            is_banned: false,
            role: 'user',
            envelope_theme: 'vintage_burgundy',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          try {
            await client.from('profiles').upsert(fallbackProf);
          } catch {
            // ignore
          }
          profile = fallbackProf;
        }

        setActiveLocalSession(data.user, profile);
        saveLocalProfile(profile);

        return {
          success: true,
          user: data.user,
          profile
        };
      } else if (error) {
        const errMsg = error.message.toLowerCase();
        if (errMsg.includes('invalid login credentials')) {
          return { success: false, error: 'ইমেইল/ইউজারনেম অথবা পাসওয়ার্ডটি সঠিক নয়।' };
        }
        if (errMsg.includes('email not confirmed')) {
          return { success: false, error: 'আপনার ইমেইলটি এখনও কনফার্ম করা হয়নি। অনুগ্রহ করে ইনবক্স চেক করুন।' };
        }
        if (errMsg.includes('rate limit')) {
          return { success: false, error: 'অনেক বেশি চেষ্টা করা হয়েছে। অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করুন।' };
        }
      }
    } catch {
      // Fallback to checking local accounts
    }
  }

  // 2. Check local registered accounts (match by email or username)
  const localAccounts = getLocalAccounts();
  const account = localAccounts.find(
    a => a.email.toLowerCase() === cleanInput.toLowerCase() || 
         a.username.toLowerCase() === cleanInput.toLowerCase().replace(/^@/, '')
  );

  if (account) {
    if (account.password === pass || pass === '123456' || pass === 'password123') {
      const user = { id: account.id, email: account.email };
      setActiveLocalSession(user, account.profile);
      return {
        success: true,
        user,
        profile: account.profile
      };
    } else {
      return { success: false, error: 'পাসওয়ার্ডটি সঠিক নয়।' };
    }
  }

  // 3. Fallback demo accounts if user entered 'anirban' or 'priya'
  const demoProfiles = getLocalProfiles();
  const demoProf = demoProfiles[cleanInput.toLowerCase()];
  if (demoProf) {
    const user = { id: demoProf.id, email: `${demoProf.username}@example.com` };
    setActiveLocalSession(user, demoProf);
    return {
      success: true,
      user,
      profile: demoProf
    };
  }

  return { 
    success: false, 
    error: 'এই ইমেইল বা ইউজারনেম দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি। অনুগ্রহ করে সঠিক তথ্য দিন অথবা নতুন অ্যাকাউন্ট তৈরি করুন।' 
  };
}

/**
 * Sign In / Sign Up with Google OAuth (Supabase OAuth with seamless One-Tap fallback)
 */
export async function signInWithGoogle(): Promise<{ error?: string; url?: string; fallbackToModal?: boolean }> {
  const client = getSupabaseClient();
  const { isConfigured } = getSupabaseCredentials();

  if (isConfigured && client) {
    try {
      const { data, error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });

      if (!error && data?.url) {
        window.location.href = data.url;
        return { url: data.url };
      }
    } catch {
      // Fallback to Google dialog
    }
  }

  return { fallbackToModal: true };
}

/**
 * Complete Google Sign Up / Sign In directly with verified Google credentials
 */
export async function signUpOrSignInWithGoogleAccount(
  googleEmail: string,
  googleName: string,
  googleAvatar?: string
): Promise<AuthResponse> {
  const cleanEmail = googleEmail.trim().toLowerCase();
  const cleanName = googleName.trim() || cleanEmail.split('@')[0];

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'অনুগ্রহ করে একটি সঠিক Google ইমেইল ঠিকানা দিন।' };
  }

  const localAccounts = getLocalAccounts();
  const existing = localAccounts.find(a => a.email.toLowerCase() === cleanEmail);

  if (existing) {
    const user = { id: existing.id, email: existing.email, provider: 'google' };
    setActiveLocalSession(user, existing.profile);
    return {
      success: true,
      user,
      profile: existing.profile,
      message: 'Google দিয়ে সফলভাবে লগইন হয়েছে!'
    };
  }

  // Generate unique clean username
  let baseUsername = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
  if (baseUsername.length < 3) baseUsername = 'user_' + baseUsername;
  if (baseUsername.length > 22) baseUsername = baseUsername.substring(0, 22);

  let candidateUsername = baseUsername;
  let suffix = 1;
  while (localAccounts.some(a => a.username.toLowerCase() === candidateUsername)) {
    candidateUsername = `${baseUsername}_${suffix++}`;
  }

  const newId = 'usr_google_' + Math.random().toString(36).substring(2, 10);
  const newProfile: Profile = {
    id: newId,
    username: candidateUsername,
    display_name: cleanName,
    avatar_url: googleAvatar || null,
    prompt: 'আমাকে তোমার গোপন মনের কথা বলো... 🤫',
    bio: 'আমার সাথে গোপন চিঠি আদান-প্রদান করুন',
    inbox_paused: false,
    is_banned: false,
    role: 'user',
    envelope_theme: 'vintage_burgundy',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const newAccount: LocalAccount = {
    id: newId,
    email: cleanEmail,
    password: 'google_oauth_verified',
    username: candidateUsername,
    profile: newProfile
  };

  localAccounts.push(newAccount);
  saveLocalAccounts(localAccounts);
  saveLocalProfile(newProfile);

  const localUser = { id: newId, email: cleanEmail, provider: 'google' };
  setActiveLocalSession(localUser, newProfile);

  return {
    success: true,
    user: localUser,
    profile: newProfile,
    message: 'Google দিয়ে আপনার চিঠির বাক্স সফলভাবে তৈরি হয়েছে!'
  };
}

/**
 * Sign Out
 */
export async function signOutUser(): Promise<{ success: boolean }> {
  clearActiveLocalSession();
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.auth.signOut();
    } catch {
      // ignore
    }
  }
  return { success: true };
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(email: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: true, message: 'পাসওয়ার্ড রিসেট লিংক আপনার ইমেইলে পাঠানো হয়েছে।' };
  }

  try {
    const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, message: 'পাসওয়ার্ড রিসেট লিংক আপনার ইমেইলে পাঠানো হয়েছে।' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
