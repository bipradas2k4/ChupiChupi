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

-- Explicitly NO client insert policy for public.messages to prevent direct injection.
-- All guest inserts MUST pass through the verified submit_anonymous_message function.

-- MESSAGE ABUSE METADATA RLS
-- Deny all access to client callers. Recipients NEVER see internal abuse metadata.
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

    insert into public.profiles (id, username, display_name, avatar_url)
    values (new.id, v_clean_username, v_display_name, new.raw_user_meta_data->>'avatar_url')
    on conflict (id) do update set
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
    v_recipient public.profiles%rowtype;
    v_new_message_id uuid;
    v_recent_count int;
    v_clean_content text;
begin
    -- 1. Validate inputs
    v_clean_content := trim(p_content);
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
    where lower(username) = lower(trim(p_recipient_username))
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
