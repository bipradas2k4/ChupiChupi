// Supabase Client and Configuration Manager for ChupiChupi

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Local storage keys for live client override / dynamic configuration
const STORAGE_URL_KEY = 'chupichupi_supabase_url';
const STORAGE_KEY_KEY = 'chupichupi_supabase_key';

// Default live production Supabase credentials for ChupiChupi (Project: wfssqoirmhvlpudooigx)
const DEFAULT_SUPABASE_URL = 'https://wfssqoirmhvlpudooigx.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indmc3Nxb2lybWh2bHB1ZG9vaWd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxODIyMDEsImV4cCI6MjEwNzc1ODIwMX0.if37nY5Nf8TBxec6x84Ag8HjV0799eKP8wUlC7pM1Pc';

export function getSupabaseCredentials(): { url: string; anonKey: string; isConfigured: boolean } {
  // Auto-purge stale or deleted project credentials and dummy accounts from browser storage
  if (typeof window !== 'undefined') {
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.includes('umpakazcsoibdlbdyalp')) {
          localStorage.removeItem(key);
        }
      });
      const storedUrl = localStorage.getItem(STORAGE_URL_KEY);
      if (storedUrl && (!storedUrl.includes('wfssqoirmhvlpudooigx') || storedUrl.includes('umpakazcsoibdlbdyalp'))) {
        localStorage.removeItem(STORAGE_URL_KEY);
        localStorage.removeItem(STORAGE_KEY_KEY);
        localStorage.removeItem('chupichupi_local_accounts');
        localStorage.removeItem('chupichupi_active_session');
      }
    } catch {
      // Ignore storage errors
    }
  }

  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_URL_KEY) : null;
  const storedKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_KEY) : null;

  // Filter out any stale/deleted project references or placeholders
  const isHealthyUrl = (u?: string | null) => 
    Boolean(u && !u.includes('umpakazcsoibdlbdyalp') && !u.includes('your-project-id') && u.startsWith('http'));
  const isHealthyKey = (k?: string | null) => 
    Boolean(k && !k.includes('umpakazcsoibdlbdyalp') && !k.includes('your-anon-key') && k.length > 20);

  const cleanStoredUrl = isHealthyUrl(storedUrl) ? storedUrl : null;
  const cleanStoredKey = isHealthyKey(storedKey) ? storedKey : null;
  const cleanEnvUrl = isHealthyUrl(envUrl) ? envUrl : null;
  const cleanEnvKey = isHealthyKey(envKey) ? envKey : null;

  const url = (cleanStoredUrl || cleanEnvUrl || DEFAULT_SUPABASE_URL).trim();
  const anonKey = (cleanStoredKey || cleanEnvKey || DEFAULT_SUPABASE_ANON_KEY).trim();

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
