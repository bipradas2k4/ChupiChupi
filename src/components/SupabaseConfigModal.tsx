import React, { useState, useEffect } from 'react';
import { X, Database, CheckCircle2, AlertTriangle, Key, Link as LinkIcon, RefreshCw, Copy, Check, Terminal, Globe, ExternalLink, ShieldCheck, Mail } from 'lucide-react';
import { getSupabaseCredentials, saveSupabaseCredentials, clearSupabaseCredentials, checkSupabaseConnection } from '../lib/supabase';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChanged: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigChanged,
}) => {
  const [url, setUrl] = useState(() => getSupabaseCredentials().url || 'https://wfssqoirmhvlpudooigx.supabase.co');
  const [anonKey, setAnonKey] = useState(() => getSupabaseCredentials().anonKey);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<{ connected: boolean; message: string; hasSchema?: boolean } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedRedirect, setCopiedRedirect] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'email' | 'oauth' | 'sql'>('config');

  const projectId = 'wfssqoirmhvlpudooigx';
  const redirectUri = `https://${projectId}.supabase.co/auth/v1/callback`;

  const runHealthCheck = async () => {
    setChecking(true);
    const res = await checkSupabaseConnection();
    setStatus(res);
    setChecking(false);
  };

  useEffect(() => {
    if (isOpen) {
      runHealthCheck();
    }
  }, [isOpen]);

  const handleSave = () => {
    saveSupabaseCredentials(url, anonKey);
    onConfigChanged();
    runHealthCheck();
  };

  const handleClear = () => {
    clearSupabaseCredentials();
    setUrl('https://wfssqoirmhvlpudooigx.supabase.co');
    setAnonKey('');
    onConfigChanged();
    setStatus({
      connected: false,
      message: 'ক্রেডেনশিয়াল মুছে ফেলা হয়েছে। স্থানীয় ডেমো মোড সক্রিয়।'
    });
  };

  const copySqlMigration = () => {
    const sql = `-- ============================================================================
-- ChupiChupi (চুপিচুপি) - Complete Database Schema & Realtime Setup
-- ============================================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text,
    username text unique not null,
    display_name text not null,
    avatar_url text,
    prompt text default 'আমাকে তোমার গোপন মনের কথা বলো... 🤫',
    bio text default 'আমার সাথে গোপন চিঠি আদান-প্রদান করুন',
    inbox_paused boolean not null default false,
    is_banned boolean not null default false,
    role text not null default 'user' check (role in ('user', 'moderator', 'admin')),
    envelope_theme text default 'vintage_burgundy',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint username_format check (username ~* '^[a-zA-Z0-9_]{3,30}$')
);
alter table public.profiles add column if not exists email text;

create table if not exists public.messages (
    id uuid primary key default gen_random_uuid(),
    recipient_id uuid not null references public.profiles(id) on delete cascade,
    category text not null check (category in ('secret', 'compliment', 'confession', 'fun', 'advice', 'friendship', 'other')),
    content text not null check (char_length(content) >= 1 and char_length(content) <= 1000),
    reaction text check (reaction in ('❤️', '🌸', '🤫', '🔥', '💌', '😂', '🥺', '👏') or reaction is null),
    reply_text text check (char_length(reply_text) <= 500 or reply_text is null),
    replied_at timestamptz,
    is_read boolean not null default false,
    is_favorite boolean not null default false,
    is_archived boolean not null default false,
    created_at timestamptz not null default now()
);

create table if not exists public.message_abuse_metadata (
    id uuid primary key references public.messages(id) on delete cascade,
    client_ip_hash text,
    user_agent_hash text,
    submission_channel text default 'web_guest',
    created_at timestamptz not null default now()
);

create table if not exists public.reports (
    id uuid primary key default gen_random_uuid(),
    message_id uuid not null references public.messages(id) on delete cascade,
    reporter_id uuid references public.profiles(id) on delete set null,
    reason text not null check (reason in ('harassment', 'hate_speech', 'spam', 'threat', 'inappropriate', 'other')),
    details text check (char_length(details) <= 500),
    status text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed')),
    created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.messages enable row level security;
alter table public.message_abuse_metadata enable row level security;
alter table public.reports enable row level security;

drop policy if exists "Profiles public read" on public.profiles;
create policy "Profiles public read" on public.profiles for select using (is_banned = false);

drop policy if exists "User can insert own profile" on public.profiles;
create policy "User can insert own profile" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "User can update own profile" on public.profiles;
create policy "User can update own profile" on public.profiles for update using (auth.uid() = id);

drop policy if exists "Recipients can view own messages" on public.messages;
create policy "Recipients can view own messages" on public.messages for select using (auth.uid() = recipient_id);

drop policy if exists "Recipients can update own messages" on public.messages;
create policy "Recipients can update own messages" on public.messages for update using (auth.uid() = recipient_id);

drop policy if exists "Recipients can delete own messages" on public.messages;
create policy "Recipients can delete own messages" on public.messages for delete using (auth.uid() = recipient_id);

drop policy if exists "Guests can insert anonymous messages" on public.messages;
create policy "Guests can insert anonymous messages" on public.messages for insert with check (recipient_id is not null and char_length(content) >= 1 and char_length(content) <= 1000);

create or replace function public.handle_new_user()
returns trigger as $$
declare
    v_raw_username text;
    v_clean_username text;
    v_display_name text;
begin
    v_raw_username := coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));
    v_clean_username := lower(regexp_replace(v_raw_username, '[^a-zA-Z0-9_]', '', 'g'));
    if length(v_clean_username) < 3 then v_clean_username := 'user_' || substr(md5(random()::text), 1, 6); end if;
    if exists (select 1 from public.profiles where username = v_clean_username) then
        v_clean_username := v_clean_username || '_' || substr(md5(random()::text), 1, 4);
    end if;
    v_display_name := coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'name', v_clean_username);
    insert into public.profiles (id, email, username, display_name, avatar_url)
    values (new.id, new.email, v_clean_username, v_display_name, new.raw_user_meta_data->>'avatar_url')
    on conflict (id) do update set
        email = coalesce(excluded.email, public.profiles.email),
        display_name = excluded.display_name,
        updated_at = now();
    return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.get_email_by_username(p_username text)
returns text as $$
declare
    v_clean_username text;
    v_email text;
begin
    v_clean_username := lower(ltrim(trim(p_username), '@'));
    select email into v_email from public.profiles where lower(username) = v_clean_username limit 1;
    if v_email is null then
        select u.email into v_email from auth.users u join public.profiles p on p.id = u.id where lower(p.username) = v_clean_username limit 1;
    end if;
    return v_email;
end;
$$ language plpgsql security definer set search_path = public, auth;
grant execute on function public.get_email_by_username to anon, authenticated, service_role;

create or replace function public.submit_anonymous_message(
    p_recipient_username text,
    p_category text,
    p_content text,
    p_client_hash text default null,
    p_user_agent_hash text default null
)
returns jsonb as $$
declare
    v_clean_username text;
    v_recipient public.profiles%rowtype;
    v_new_message_id uuid;
    v_recent_count int;
    v_clean_content text;
begin
    v_clean_content := trim(p_content);
    v_clean_username := lower(ltrim(trim(p_recipient_username), '@'));
    if v_clean_content is null or length(v_clean_content) < 1 then return jsonb_build_object('success', false, 'error', 'চিঠি ফাঁকা হতে পারে না।'); end if;
    if length(v_clean_content) > 1000 then return jsonb_build_object('success', false, 'error', 'চিঠি সর্বোচ্চ ১০০০ অক্ষরের হতে পারে।'); end if;
    if p_category not in ('secret', 'compliment', 'confession', 'fun', 'advice', 'friendship', 'other') then return jsonb_build_object('success', false, 'error', 'অবৈধ বিভাগ।'); end if;
    select * into v_recipient from public.profiles where lower(username) = v_clean_username and is_banned = false;
    if not found then return jsonb_build_object('success', false, 'error', 'প্রাপক খুঁজে পাওয়া যায়নি।'); end if;
    if v_recipient.inbox_paused = true then return jsonb_build_object('success', false, 'error', 'চিঠি বাক্সটি বর্তমানে সাময়িকভাবে বন্ধ আছে।'); end if;
    if p_client_hash is not null and p_client_hash <> '' then
        select count(*) into v_recent_count from public.message_abuse_metadata where client_ip_hash = p_client_hash and created_at > now() - interval '10 minutes';
        if v_recent_count >= 8 then return jsonb_build_object('success', false, 'error', 'খুব বেশি চিঠি পাঠানো হয়েছে। অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করুন।'); end if;
    end if;
    insert into public.messages (recipient_id, category, content) values (v_recipient.id, p_category, v_clean_content) returning id into v_new_message_id;
    insert into public.message_abuse_metadata (id, client_ip_hash, user_agent_hash) values (v_new_message_id, p_client_hash, p_user_agent_hash);
    return jsonb_build_object('success', true, 'message_id', v_new_message_id, 'recipient_username', v_recipient.username, 'delivered_at', now());
end;
$$ language plpgsql security definer set search_path = public;
grant execute on function public.submit_anonymous_message to anon, authenticated, service_role;

alter table public.messages replica identity full;
do $$
begin
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
        alter publication supabase_realtime add table public.messages;
    end if;
end $$;`;
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const copyRedirectUri = () => {
    navigator.clipboard.writeText(redirectUri);
    setCopiedRedirect(true);
    setTimeout(() => setCopiedRedirect(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '640px', padding: '2rem' }}
        id="supabase-config-modal"
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '1rem',
          marginBottom: '1.25rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Database size={22} color="#fbbf24" />
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: '#fdf4ea' }}>
              Supabase ব্যাকএন্ড ও OAuth কনফিগারেশন
            </h3>
          </div>
          <button 
            onClick={onClose}
            id="close-supabase-modal-btn"
            style={{ background: 'transparent', border: 'none', color: '#c4b5a5', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('config')}
            id="modal-tab-config"
            className={`btn ${activeTab === 'config' ? 'btn-secondary' : 'btn-ghost'}`}
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
          >
            কানেকশন সেটিংস
          </button>
          <button
            onClick={() => setActiveTab('email')}
            id="modal-tab-email"
            className={`btn ${activeTab === 'email' ? 'btn-secondary' : 'btn-ghost'}`}
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
          >
            <Mail size={14} />
            <span>ইমেইল ভেরিফিকেশন</span>
          </button>
          <button
            onClick={() => setActiveTab('oauth')}
            id="modal-tab-oauth"
            className={`btn ${activeTab === 'oauth' ? 'btn-secondary' : 'btn-ghost'}`}
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
          >
            <Globe size={14} />
            <span>Google OAuth সেটআপ</span>
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            id="modal-tab-sql"
            className={`btn ${activeTab === 'sql' ? 'btn-secondary' : 'btn-ghost'}`}
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
          >
            <Terminal size={14} />
            <span>SQL মাইগ্রেশন</span>
          </button>
        </div>

        {activeTab === 'config' && (
          <div>
            {/* Live Status Card */}
            <div style={{
              padding: '1rem',
              borderRadius: '12px',
              background: status?.connected ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
              border: `1px solid ${status?.connected ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`,
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem'
            }}>
              {status?.connected ? (
                <CheckCircle2 size={20} color="#4ade80" style={{ marginTop: '2px', flexShrink: 0 }} />
              ) : (
                <AlertTriangle size={20} color="#facc15" style={{ marginTop: '2px', flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, fontSize: '0.88rem' }}>
                <div style={{ fontWeight: 600, color: status?.connected ? '#4ade80' : '#facc15', marginBottom: '0.2rem' }}>
                  {status?.connected ? 'Supabase ব্যাকএন্ড সক্রিয়' : 'সরাসরি ব্যাকএন্ড অনুপস্থিত (ডেমো সক্রিয়)'}
                </div>
                <div style={{ color: '#c4b5a5', lineHeight: 1.5 }}>
                  {checking ? 'কানেকশন পরীক্ষা করা হচ্ছে...' : status?.message}
                </div>
              </div>
              <button
                onClick={runHealthCheck}
                disabled={checking}
                className="btn btn-ghost"
                title="পুনরায় পরীক্ষা করুন"
                style={{ padding: '0.4rem', color: '#fbbf24' }}
              >
                <RefreshCw size={15} className={checking ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* Inputs */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <LinkIcon size={14} />
                <span>Supabase Project URL</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="https://wfssqoirmhvlpudooigx.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Key size={14} />
                <span>Supabase Anon Public Key (Publishable)</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
              />
              <div style={{ fontSize: '0.75rem', color: '#a8998b', marginTop: '0.35rem', lineHeight: 1.5 }}>
                🔑 Supabase ড্যাশবোর্ডে গিয়ে <strong>Project Settings &gt; API &gt; Project API keys &gt; anon public</strong> কী কপি করে এখানে পেস্ট করুন।
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button onClick={handleClear} className="btn btn-ghost" style={{ fontSize: '0.85rem' }}>
                মুছে ফেলুন (Clear)
              </button>
              <button onClick={handleSave} className="btn btn-primary" style={{ padding: '0.6rem 1.4rem' }}>
                সংরক্ষণ ও কানেক্ট করুন
              </button>
            </div>
          </div>
        )}

        {activeTab === 'email' && (
          <div>
            <div style={{ fontSize: '0.9rem', color: '#c4b5a5', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              <p style={{ marginBottom: '0.75rem', color: '#fdf4ea' }}>
                <strong style={{ color: '#fbbf24' }}>Supabase-এ নতুন ইউজারদের জন্য Email Verification চালু করার নিয়ম:</strong>
              </p>
              <ol style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <li>
                  Supabase ড্যাশবোর্ডে প্রবেশ করুন: <br />
                  <a 
                    href="https://supabase.com/dashboard/project/wfssqoirmhvlpudooigx/auth/providers" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#fbbf24', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}
                  >
                    <span>Authentication &gt; Providers &gt; Email</span>
                    <ExternalLink size={12} />
                  </a>
                </li>
                <li>
                  <strong>"Confirm email"</strong> টগলটি <strong>ON</strong> (সক্রিয়) করুন। এর ফলে প্রতিটি নতুন ব্যবহারকারীকে সাইন-আপ করার পর স্বয়ংক্রিয়ভাবে নিশ্চিতকরণ ইমেইল পাঠানো হবে।
                </li>
                <li>
                  <a 
                    href="https://supabase.com/dashboard/project/wfssqoirmhvlpudooigx/auth/url-configuration" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#fbbf24', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <span>Authentication &gt; URL Configuration</span>
                    <ExternalLink size={12} />
                  </a> এ যান এবং <strong>Redirect URLs</strong>-এ নিচের লিংকগুলো যোগ করুন:
                </li>
              </ol>
            </div>

            {/* Redirect URLs Box */}
            <div style={{
              background: '#0a050d',
              borderRadius: '12px',
              padding: '0.85rem 1rem',
              border: '1px solid var(--border-subtle)',
              marginBottom: '1.25rem',
              fontSize: '0.82rem',
              fontFamily: 'monospace',
              color: '#4ade80',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem'
            }}>
              <div>https://chupichupi-app.vercel.app/dashboard</div>
              <div>https://chupi-chupi.vercel.app/dashboard</div>
              <div>http://localhost:5173/dashboard</div>
            </div>

            <div style={{
              padding: '0.85rem 1rem',
              borderRadius: '10px',
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.25)',
              fontSize: '0.82rem',
              color: '#4ade80',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>আমাদের অ্যাপ্লিকেশনে স্বয়ংক্রিয় ইমেইল ভেরিফিকেশন পেজ, রি-সেন্ড কাউন্টডাউন এবং নিশ্চিতকরণ হ্যান্ডলিং পুরোপুরি প্রস্তুত।</span>
            </div>
          </div>
        )}

        {activeTab === 'oauth' && (
          <div>
            <div style={{ fontSize: '0.9rem', color: '#c4b5a5', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              <p style={{ marginBottom: '0.75rem', color: '#fdf4ea' }}>
                <strong style={{ color: '#fbbf24' }}>Supabase-এ Google Sign-In চালু করার নিয়ম:</strong>
              </p>
              <ol style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <li>
                  Supabase ড্যাশবোর্ডে প্রবেশ করুন: <br />
                  <a 
                    href="https://supabase.com/dashboard/project/wfssqoirmhvlpudooigx/auth/providers" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#fbbf24', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <span>Authentication &gt; Providers &gt; Google</span>
                    <ExternalLink size={12} />
                  </a>
                </li>
                <li>
                  <strong>Enable Google provider</strong> টগলটি <strong>ON</strong> করুন।
                </li>
                <li>
                  <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" style={{ color: '#f472b6' }}>
                    Google Cloud Console
                  </a> থেকে প্রাপ্ত <strong>Client ID</strong> এবং <strong>Client Secret</strong> বসিয়ে দিন।
                </li>
                <li>
                  Google Cloud Console-এর OAuth Client-এ Authorized Redirect URI হিসেবে নিচের লিঙ্কটি দিন:
                </li>
              </ol>
            </div>

            {/* Redirect URI Box with 1-click copy */}
            <div style={{
              background: '#0a050d',
              borderRadius: '12px',
              padding: '0.85rem 1rem',
              border: '1px solid var(--border-subtle)',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem'
            }}>
              <div style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#4ade80', wordBreak: 'break-all' }}>
                {redirectUri}
              </div>
              <button
                type="button"
                onClick={copyRedirectUri}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', flexShrink: 0 }}
              >
                {copiedRedirect ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
                <span>{copiedRedirect ? 'কপি হয়েছে' : 'কপি URI'}</span>
              </button>
            </div>

            <div style={{
              padding: '0.85rem 1rem',
              borderRadius: '10px',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              fontSize: '0.82rem',
              color: '#93c5fd',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <ShieldCheck size={16} style={{ flexShrink: 0 }} />
              <span>Google সাইন-ইন সক্রিয় হলে দর্শনার্থীরা ১-ক্লিকেই তাদের চিঠি বাক্স তৈরি করতে পারবেন।</span>
            </div>
          </div>
        )}

        {activeTab === 'sql' && (
          <div>
            <div style={{ fontSize: '0.88rem', color: '#c4b5a5', lineHeight: 1.6, marginBottom: '1rem' }}>
              <p style={{ marginBottom: '0.75rem' }}>
                আপনার Supabase প্রজেক্টে <strong style={{ color: '#fbbf24' }}>SQL Editor</strong> ওপেন করুন এবং <code style={{ color: '#fca5a5' }}>supabase/schema.sql</code> ফাইলের সম্পূর্ণ কোড চালিয়ে টেবিল, আরএলএস এবং ফাংশন তৈরি করুন:
              </p>
              <ul style={{ paddingLeft: '1.25rem', marginBottom: '1rem', color: '#e2d7ce' }}>
                <li><strong>profiles:</strong> ব্যবহারকারীর প্রোফাইল ও ইউজারনেম</li>
                <li><strong>messages:</strong> গোপন চিঠিসমূহ (শুধুমাত্র প্রাপকের RLS প্রবেশাধিকার)</li>
                <li><strong>message_abuse_metadata:</strong> প্রেরকের গোপনীয়তা বজায় রেখে অপব্যবহার রোধক মেটাডেটা</li>
                <li><strong>submit_anonymous_message:</strong> গেস্ট-ফার্স্ট নিরাপদ RPC ফাংশন</li>
              </ul>
            </div>

            <div style={{
              background: '#0a050d',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              border: '1px solid var(--border-subtle)',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              color: '#4ade80',
              maxHeight: '180px',
              overflowY: 'auto',
              marginBottom: '1rem'
            }}>
              -- ফাইলের অবস্থান: supabase/schema.sql<br />
              -- সম্পন্ন স্কিমা, সিকিউরিটি ও RLS পলিসি অন্তর্ভুক্ত আছে।
            </div>

            <button
              onClick={copySqlMigration}
              className="btn btn-secondary"
              style={{ width: '100%', padding: '0.6rem 1rem' }}
            >
              {copiedSql ? <Check size={16} /> : <Copy size={16} />}
              <span>{copiedSql ? 'পাথ কপি হয়েছে!' : 'স্কিমা নির্দেশিকা কপি করুন'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
