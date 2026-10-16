// Supabase Client and Configuration Manager for ChupiChupi

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Local storage keys for live client override / dynamic configuration
const STORAGE_URL_KEY = 'chupichupi_supabase_url';
const STORAGE_KEY_KEY = 'chupichupi_supabase_key';

export function getSupabaseCredentials(): { url: string; anonKey: string; isConfigured: boolean } {
  // Check localStorage first (in-browser setting), then import.meta.env
  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_URL_KEY) : null;
  const storedKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_KEY) : null;

  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const url = (storedUrl || envUrl || '').trim();
  const anonKey = (storedKey || envKey || '').trim();

  const isConfigured = 
    Boolean(url) && 
    Boolean(anonKey) && 
    !url.includes('your-project-id') && 
    !anonKey.includes('your-anon-key');

  return { url, anonKey, isConfigured };
}

export function saveSupabaseCredentials(url: string, anonKey: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_URL_KEY, url.trim());
    localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
  }
}

export function clearSupabaseCredentials(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_URL_KEY);
    localStorage.removeItem(STORAGE_KEY_KEY);
  }
}

let supabaseInstance: SupabaseClient | null = null;
let lastUrl = '';
let lastKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey, isConfigured } = getSupabaseCredentials();

  if (!isConfigured) {
    return null;
  }

  if (!supabaseInstance || lastUrl !== url || lastKey !== anonKey) {
    supabaseInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    lastUrl = url;
    lastKey = anonKey;
  }

  return supabaseInstance;
}

export async function checkSupabaseConnection(): Promise<{
  connected: boolean;
  message: string;
  hasSchema?: boolean;
}> {
  const client = getSupabaseClient();
  const { isConfigured, url } = getSupabaseCredentials();

  if (!isConfigured || !client) {
    return {
      connected: false,
      message: 'Supabase credentials are not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    };
  }

  try {
    // Attempt to query the profiles table to verify both connection and migration existence
    const { error } = await client
      .from('profiles')
      .select('username')
      .limit(1);

    if (error) {
      // If table doesn't exist yet
      if (error.code === '42P01') {
        return {
          connected: true,
          hasSchema: false,
          message: 'Connected to Supabase, but tables are missing. Please run the migration SQL in the Supabase SQL editor.',
        };
      }
      return {
        connected: false,
        message: `Supabase error: ${error.message}`,
      };
    }

    return {
      connected: true,
      hasSchema: true,
      message: `Successfully connected to Supabase project at ${new URL(url).hostname}. Tables are ready!`,
    };
  } catch (err: any) {
    return {
      connected: false,
      message: `Network error connecting to Supabase: ${err.message || 'Failed to fetch'}`,
    };
  }
}
