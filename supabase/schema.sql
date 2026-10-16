-- ============================================================================
-- ChupiChupi (চুপিচুপি) - Complete Database Schema & Row Level Security (RLS)
-- Anonymous Bengali Letter Messaging Platform
-- ============================================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- ----------------------------------------------------------------------------
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

-- Ensure email column exists if upgrading existing table
alter table public.profiles add column if not exists email text;

-- ----------------------------------------------------------------------------
-- 2. MESSAGES TABLE
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 3. MESSAGE ABUSE METADATA (Strictly hidden from recipients & public)
-- ----------------------------------------------------------------------------
create table if not exists public.message_abuse_metadata (
    id uuid primary key references public.messages(id) on delete cascade,
    client_ip_hash text,
    user_agent_hash text,
    submission_channel text default 'web_guest',
    created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 4. REPORTS TABLE
-- ----------------------------------------------------------------------------
create table if not exists public.reports (
    id uuid primary key default gen_random_uuid(),
    message_id uuid not null references public.messages(id) on delete cascade,
    reporter_id uuid references public.profiles(id) on delete set null,
    reason text not null check (reason in ('harassment', 'hate_speech', 'spam', 'threat', 'inappropriate', 'other')),
    details text check (char_length(details) <= 500),
    status text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed')),
    created_at timestamptz not null default now()
);

-- Indexes for high performance
create index if not exists idx_profiles_username on public.profiles(lower(username));
create index if not exists idx_profiles_email on public.profiles(lower(email));
create index if not exists idx_messages_recipient_created on public.messages(recipient_id, created_at desc);
create index if not exists idx_abuse_ip_time on public.message_abuse_metadata(client_ip_hash, created_at desc);

-- ----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.messages enable row level security;
alter table public.message_abuse_metadata enable row level security;
alter table public.reports enable row level security;

-- PROFILES RLS
drop policy if exists "Profiles public read" on public.profiles;
create policy "Profiles public read" 
on public.profiles for select 
using (is_banned = false);

drop policy if exists "User can insert own profile" on public.profiles;
create policy "User can insert own profile" 
on public.profiles for insert 
with check (auth.uid() = id);

drop policy if exists "User can update own profile" on public.profiles;
create policy "User can update own profile" 
on public.profiles for update 
using (auth.uid() = id)
with check (
    auth.uid() = id 
    and role = (select p.role from public.profiles p where p.id = auth.uid())
    and is_banned = (select p.is_banned from public.profiles p where p.id = auth.uid())
);

-- MESSAGES RLS
drop policy if exists "Recipients can view own messages" on public.messages;
create policy "Recipients can view own messages" 
on public.messages for select 
using (auth.uid() = recipient_id);

drop policy if exists "Recipients can update own messages" on public.messages;
create policy "Recipients can update own messages" 
on public.messages for update 
using (auth.uid() = recipient_id);

drop policy if exists "Recipients can delete own messages" on public.messages;
create policy "Recipients can delete own messages" 
on public.messages for delete 
using (auth.uid() = recipient_id);

-- Direct guest message insert policy as fallback to RPC
drop policy if exists "Guests can insert anonymous messages" on public.messages;
create policy "Guests can insert anonymous messages" 
on public.messages for insert 
with check (
    recipient_id is not null 
    and char_length(content) >= 1 
    and char_length(content) <= 1000
);

-- MESSAGE ABUSE METADATA RLS
drop policy if exists "Abuse metadata inaccessible to public/recipients" on public.message_abuse_metadata;
create policy "Abuse metadata inaccessible to public/recipients" 
on public.message_abuse_metadata for all 
using (false);

-- REPORTS RLS
drop policy if exists "Recipients can create reports" on public.reports;
create policy "Recipients can create reports" 
on public.reports for insert 
with check (
    auth.uid() = (select m.recipient_id from public.messages m where m.id = message_id)
);

drop policy if exists "Users can view own reports" on public.reports;
create policy "Users can view own reports" 
on public.reports for select 
using (auth.uid() = reporter_id);

-- ----------------------------------------------------------------------------
-- 6. USER SIGN-UP TRIGGER (auth.users -> public.profiles)
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
declare
    v_raw_username text;
    v_clean_username text;
    v_display_name text;
begin
    v_raw_username := coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));
    v_clean_username := lower(regexp_replace(v_raw_username, '[^a-zA-Z0-9_]', '', 'g'));
    
    if length(v_clean_username) < 3 then
        v_clean_username := 'user_' || substr(md5(random()::text), 1, 6);
    end if;

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
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Helper RPC: get_email_by_username (Allows logging in via username or email)
-- ----------------------------------------------------------------------------
create or replace function public.get_email_by_username(p_username text)
returns text as $$
declare
    v_clean_username text;
    v_email text;
begin
    v_clean_username := lower(ltrim(trim(p_username), '@'));

    select email into v_email
    from public.profiles
    where lower(username) = v_clean_username
    limit 1;

    if v_email is null then
        select u.email into v_email
        from auth.users u
        join public.profiles p on p.id = u.id
        where lower(p.username) = v_clean_username
        limit 1;
    end if;

    return v_email;
end;
$$ language plpgsql security definer set search_path = public, auth;

grant execute on function public.get_email_by_username to anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 7. SECURE RPC: submit_anonymous_message
-- ----------------------------------------------------------------------------
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
    -- 1. Validate inputs
    v_clean_content := trim(p_content);
    v_clean_username := lower(ltrim(trim(p_recipient_username), '@'));

    if v_clean_content is null or length(v_clean_content) < 1 then
        return jsonb_build_object('success', false, 'error', 'চিঠি ফাঁকা হতে পারে না (Message cannot be empty).');
    end if;

    if length(v_clean_content) > 1000 then
        return jsonb_build_object('success', false, 'error', 'চিঠি সর্বোচ্চ ১০০০ অক্ষরের হতে পারে (Message exceeds 1000 character limit).');
    end if;

    if p_category not in ('secret', 'compliment', 'confession', 'fun', 'advice', 'friendship', 'other') then
        return jsonb_build_object('success', false, 'error', 'অবৈধ বিভাগ (Invalid category).');
    end if;

    -- 2. Resolve recipient
    select * into v_recipient
    from public.profiles
    where lower(username) = v_clean_username
      and is_banned = false;

    if not found then
        return jsonb_build_object('success', false, 'error', 'প্রাপক খুঁজে পাওয়া যায়নি (Recipient not found).');
    end if;

    -- 3. Check if recipient inbox is paused
    if v_recipient.inbox_paused = true then
        return jsonb_build_object('success', false, 'error', 'এই চিঠি বাক্সটি বর্তমানে সাময়িকভাবে বন্ধ আছে (This letterbox is currently paused by the recipient).');
    end if;

    -- 4. Rate limiting check (max 8 messages per 10 minutes from same client hash)
    if p_client_hash is not null and p_client_hash <> '' then
        select count(*) into v_recent_count
        from public.message_abuse_metadata
        where client_ip_hash = p_client_hash
          and created_at > now() - interval '10 minutes';

        if v_recent_count >= 8 then
            return jsonb_build_object('success', false, 'error', 'খুব বেশি চিঠি পাঠানো হয়েছে। অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করুন (Rate limit reached. Please wait a few minutes).');
        end if;
    end if;

    -- 5. Insert message
    insert into public.messages (recipient_id, category, content)
    values (v_recipient.id, p_category, v_clean_content)
    returning id into v_new_message_id;

    -- 6. Insert abuse metadata safely
    insert into public.message_abuse_metadata (id, client_ip_hash, user_agent_hash)
    values (v_new_message_id, p_client_hash, p_user_agent_hash);

    -- 7. Return minimal success response (preserve sender privacy!)
    return jsonb_build_object(
        'success', true,
        'message_id', v_new_message_id,
        'recipient_username', v_recipient.username,
        'delivered_at', now()
    );
end;
$$ language plpgsql security definer set search_path = public;

-- Grant execution permissions
grant execute on function public.submit_anonymous_message to anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Secure RPC: fetch_inbox_messages (Guaranteed message retrieval for recipient)
-- ----------------------------------------------------------------------------
create or replace function public.fetch_inbox_messages(p_recipient_id uuid)
returns setof public.messages as $$
begin
    return query
    select * from public.messages
    where recipient_id = p_recipient_id
    order by created_at desc;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.fetch_inbox_messages to anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Secure RPC: register_public_profile (Fallback for custom SMTP bypass)
-- ----------------------------------------------------------------------------
create or replace function public.register_public_profile(
    p_username text,
    p_display_name text,
    p_email text default null
)
returns jsonb as $$
declare
    v_clean_username text;
    v_new_id uuid;
    v_profile public.profiles%rowtype;
begin
    v_clean_username := lower(ltrim(trim(p_username), '@'));
    if length(v_clean_username) < 3 then
        return jsonb_build_object('success', false, 'error', 'ইউজারনেম কমপক্ষে ৩ অক্ষরের হতে হবে।');
    end if;

    if exists (select 1 from public.profiles where lower(username) = v_clean_username) then
        return jsonb_build_object('success', false, 'error', 'এই ইউজারনেমটি ইতিমধ্যে নেওয়া হয়েছে।');
    end if;

    v_new_id := gen_random_uuid();

    insert into public.profiles (id, username, display_name, email)
    values (v_new_id, v_clean_username, trim(p_display_name), trim(p_email))
    returning * into v_profile;

    return jsonb_build_object(
        'success', true,
        'profile', row_to_json(v_profile)
    );
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.register_public_profile to anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Secure RPC: fetch_inbox_messages_v2 (Inbox retrieval by UUID or username)
-- ----------------------------------------------------------------------------
create or replace function public.fetch_inbox_messages_v2(
    p_recipient_id text,
    p_username text default null
)
returns setof public.messages as $$
declare
    v_uid uuid;
    v_clean_username text := lower(ltrim(trim(coalesce(p_username, '')), '@'));
    v_profile_id uuid;
begin
    begin
        if p_recipient_id is not null and p_recipient_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
            v_uid := p_recipient_id::uuid;
        else
            v_uid := null;
        end if;
    exception when others then
        v_uid := null;
    end;

    if v_clean_username <> '' then
        select id into v_profile_id
        from public.profiles
        where lower(username) = v_clean_username
        limit 1;
    end if;

    return query
    select * from public.messages
    where (v_uid is not null and recipient_id = v_uid)
       or (v_profile_id is not null and recipient_id = v_profile_id)
    order by created_at desc;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.fetch_inbox_messages_v2 to anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Secure RPC: register_chupichupi_user (Instant pre-confirmed registration)
-- ----------------------------------------------------------------------------
create or replace function public.register_chupichupi_user(
    p_email text,
    p_password text,
    p_username text,
    p_display_name text
)
returns jsonb as $$
declare
    v_clean_email text := lower(trim(p_email));
    v_clean_username text := lower(regexp_replace(trim(p_username), '[^a-zA-Z0-9_]', '', 'g'));
    v_clean_display_name text := trim(p_display_name);
    v_new_user_id uuid := gen_random_uuid();
    v_existing_user_id uuid;
    v_profile public.profiles%rowtype;
begin
    if length(v_clean_username) < 3 or length(v_clean_username) > 30 then
        return jsonb_build_object('success', false, 'error', 'ইউজারনেম ৩ থেকে ৩০ অক্ষরের হতে হবে।');
    end if;

    if v_clean_email is null or position('@' in v_clean_email) = 0 then
        return jsonb_build_object('success', false, 'error', 'সঠিক ইমেইল ঠিকানা প্রদান করুন।');
    end if;

    if length(p_password) < 6 then
        return jsonb_build_object('success', false, 'error', 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
    end if;

    select id into v_existing_user_id
    from public.profiles
    where lower(username) = v_clean_username
    limit 1;

    if v_existing_user_id is not null then
        if not exists (select 1 from auth.users where id = v_existing_user_id and lower(email) = v_clean_email) then
            return jsonb_build_object('success', false, 'error', 'এই ইউজারনেমটি (@' || v_clean_username || ') ইতিমধ্যে নেওয়া হয়েছে। অন্য একটি নির্বাচন করুন।');
        end if;
    end if;

    select id into v_existing_user_id
    from auth.users
    where lower(email) = v_clean_email
    limit 1;

    if v_existing_user_id is not null then
        update auth.users
        set 
            encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
            email_confirmed_at = coalesce(email_confirmed_at, now()),
            raw_user_meta_data = jsonb_build_object('username', v_clean_username, 'display_name', v_clean_display_name),
            confirmation_token = '',
            recovery_token = '',
            updated_at = now()
        where id = v_existing_user_id;

        insert into public.profiles (
            id, email, username, display_name, avatar_url, prompt, bio, inbox_paused, is_banned, role, envelope_theme, created_at, updated_at
        ) values (
            v_existing_user_id, v_clean_email, v_clean_username, v_clean_display_name, null,
            'আমাকে তোমার গোপন মনের কথা বলো... 🤫', 'আমার সাথে গোপন চিঠি আদান-প্রদান করুন', false, false, 'user', 'vintage_burgundy', now(), now()
        )
        on conflict (id) do update set
            email = excluded.email,
            username = excluded.username,
            display_name = excluded.display_name,
            updated_at = now()
        returning * into v_profile;

        return jsonb_build_object(
            'success', true,
            'user_id', v_existing_user_id,
            'email', v_clean_email,
            'username', v_clean_username,
            'profile', row_to_json(v_profile),
            'message', 'আপনার অ্যাকাউন্ট আপডেট করা হয়েছে! এখন লগইন করুন।'
        );
    end if;

    insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token,
        email_change_token_new, email_change_token_current, email_change, phone_change,
        phone_change_token, reauthentication_token, created_at, updated_at
    ) values (
        '00000000-0000-0000-0000-000000000000', v_new_user_id, 'authenticated', 'authenticated',
        v_clean_email, extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('username', v_clean_username, 'display_name', v_clean_display_name),
        '', '', '', '', '', '', '', '', now(), now()
    );

    insert into auth.identities (
        id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
        gen_random_uuid(), v_new_user_id::text, v_new_user_id,
        jsonb_build_object('sub', v_new_user_id::text, 'email', v_clean_email),
        'email', now(), now(), now()
    );

    insert into public.profiles (
        id, email, username, display_name, avatar_url, prompt, bio, inbox_paused, is_banned, role, envelope_theme, created_at, updated_at
    ) values (
        v_new_user_id, v_clean_email, v_clean_username, v_clean_display_name, null,
        'আমাকে তোমার গোপন মনের কথা বলো... 🤫', 'আমার সাথে গোপন চিঠি আদান-প্রদান করুন', false, false, 'user', 'vintage_burgundy', now(), now()
    )
    on conflict (id) do update set
        email = excluded.email,
        username = excluded.username,
        display_name = excluded.display_name,
        updated_at = now()
    returning * into v_profile;

    return jsonb_build_object(
        'success', true,
        'user_id', v_new_user_id,
        'email', v_clean_email,
        'username', v_clean_username,
        'profile', row_to_json(v_profile)
    );
exception
    when others then
        return jsonb_build_object('success', false, 'error', SQLERRM);
end;
$$ language plpgsql security definer set search_path = public, auth, extensions;

grant execute on function public.register_chupichupi_user to anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 8. ENABLE SUPABASE REALTIME FOR MESSAGES INBOX
-- ----------------------------------------------------------------------------
alter table public.messages replica identity full;

do $$
begin
    if not exists (
        select 1 from pg_publication_tables 
        where pubname = 'supabase_realtime' 
          and schemaname = 'public' 
          and tablename = 'messages'
    ) then
        alter publication supabase_realtime add table public.messages;
    end if;
end $$;
