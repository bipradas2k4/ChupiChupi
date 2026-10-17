-- ChupiChupi (চুপিচুপি) - Complete Database Schema Migration
-- Migration: 20261017000001_initial_schema.sql
-- Project ID: wfssqoirmhvlpudooigx

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. APPLICATION PROFILES TABLE
-- Linked directly to real Supabase Auth users via auth.users(id)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL CHECK (
        CHAR_LENGTH(username) >= 3 
        AND CHAR_LENGTH(username) <= 30 
        AND username ~ '^[a-zA-Z0-9_]+$'
    ),
    display_name TEXT NOT NULL CHECK (CHAR_LENGTH(display_name) >= 2),
    avatar_url TEXT,
    prompt TEXT DEFAULT 'আমাকে তোমার গোপন মনের কথা বলো... 🤫',
    bio TEXT DEFAULT 'আমার সাথে গোপন চিঠি আদান-প্রদান করুন',
    inbox_paused BOOLEAN DEFAULT FALSE NOT NULL,
    is_banned BOOLEAN DEFAULT FALSE NOT NULL,
    role TEXT DEFAULT 'user' NOT NULL CHECK (role IN ('user', 'moderator', 'admin')),
    envelope_theme TEXT DEFAULT 'vintage_burgundy',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_username_lower ON public.profiles (LOWER(username));

-- 3. INBOX SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.inbox_settings (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    allow_anonymous BOOLEAN DEFAULT TRUE NOT NULL,
    filter_profanity BOOLEAN DEFAULT FALSE NOT NULL,
    notify_email BOOLEAN DEFAULT FALSE NOT NULL,
    auto_archive_days INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('secret', 'confession', 'compliment', 'fun', 'advice', 'friendship', 'other')),
    content TEXT NOT NULL CHECK (CHAR_LENGTH(content) > 0 AND CHAR_LENGTH(content) <= 1000),
    reaction TEXT,
    reply_text TEXT,
    replied_at TIMESTAMPTZ,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    is_favorite BOOLEAN DEFAULT FALSE NOT NULL,
    is_archived BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_recipient_created ON public.messages (recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_unread ON public.messages (recipient_id) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_messages_recipient_favorite ON public.messages (recipient_id) WHERE is_favorite = true;

-- 5. PRIVATE MESSAGE SENDERS TABLE (Separately restricted metadata)
CREATE TABLE IF NOT EXISTS public.private_message_senders (
    message_id UUID PRIMARY KEY REFERENCES public.messages(id) ON DELETE CASCADE,
    client_hash TEXT,
    user_agent_hash TEXT,
    ip_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_private_senders_client_hash ON public.private_message_senders (client_hash, created_at DESC);

-- Backward compatibility view for previous metadata references
CREATE OR REPLACE VIEW public.message_abuse_metadata AS
    SELECT 
        message_id AS id, 
        client_hash AS client_ip_hash, 
        user_agent_hash, 
        ip_hash, 
        created_at
    FROM public.private_message_senders;

-- 6. MESSAGE REACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_message_reaction UNIQUE (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON public.message_reactions (message_id);

-- 7. MESSAGE REPLIES TABLE
CREATE TABLE IF NOT EXISTS public.message_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reply_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_message_replies_message ON public.message_replies (message_id);

-- 8. USER BLOCKS TABLE
CREATE TABLE IF NOT EXISTS public.user_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_identifier TEXT NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_user_block UNIQUE (blocker_id, blocked_identifier)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON public.user_blocks (blocker_id, blocked_identifier);

-- 9. ABUSE REPORTS TABLE
CREATE TABLE IF NOT EXISTS public.abuse_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    reporter_identifier TEXT,
    reason TEXT NOT NULL CHECK (reason IN ('harassment', 'hate_speech', 'spam', 'threat', 'inappropriate', 'other')),
    details TEXT,
    status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_abuse_reports_message ON public.abuse_reports (message_id);

-- Backward compatibility view for 'reports'
CREATE OR REPLACE VIEW public.reports AS
    SELECT id, message_id, reporter_identifier, reason, details, status, created_at
    FROM public.abuse_reports;

CREATE OR REPLACE FUNCTION public.tr_insert_reports_view()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.abuse_reports (id, message_id, reporter_identifier, reason, details, status, created_at)
    VALUES (
        COALESCE(NEW.id, gen_random_uuid()),
        NEW.message_id,
        NEW.reporter_identifier,
        NEW.reason,
        NEW.details,
        COALESCE(NEW.status, 'pending'),
        COALESCE(NEW.created_at, NOW())
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_reports_insert ON public.reports;
CREATE TRIGGER tr_reports_insert
    INSTEAD OF INSERT ON public.reports
    FOR EACH ROW EXECUTE FUNCTION public.tr_insert_reports_view();

-- 10. POLLS & TIME CAPSULES & NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.poll_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
    voter_hash TEXT NOT NULL,
    option_index INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_poll_vote UNIQUE (poll_id, voter_hash)
);

CREATE TABLE IF NOT EXISTS public.time_capsules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    unlock_at TIMESTAMPTZ NOT NULL,
    is_unlocked BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'new_letter',
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications (user_id) WHERE is_read = false;

-- 11. ROW LEVEL SECURITY (RLS) POLICIES

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles public read" ON public.profiles;
CREATE POLICY "Profiles public read" 
    ON public.profiles FOR SELECT 
    USING (is_banned = false);

DROP POLICY IF EXISTS "User can insert own profile" ON public.profiles;
CREATE POLICY "User can insert own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "User can update own profile" ON public.profiles;
CREATE POLICY "User can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id) 
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "User can delete own profile" ON public.profiles;
CREATE POLICY "User can delete own profile" 
    ON public.profiles FOR DELETE 
    USING (auth.uid() = id);

-- Inbox Settings
ALTER TABLE public.inbox_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User can view own inbox settings" ON public.inbox_settings;
CREATE POLICY "User can view own inbox settings" 
    ON public.inbox_settings FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "User can update own inbox settings" ON public.inbox_settings;
CREATE POLICY "User can update own inbox settings" 
    ON public.inbox_settings FOR UPDATE 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "User can insert own inbox settings" ON public.inbox_settings;
CREATE POLICY "User can insert own inbox settings" 
    ON public.inbox_settings FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Recipients can view own messages" ON public.messages;
CREATE POLICY "Recipients can view own messages" 
    ON public.messages FOR SELECT 
    USING (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Recipients can update own messages" ON public.messages;
CREATE POLICY "Recipients can update own messages" 
    ON public.messages FOR UPDATE 
    USING (auth.uid() = recipient_id) 
    WITH CHECK (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Recipients can delete own messages" ON public.messages;
CREATE POLICY "Recipients can delete own messages" 
    ON public.messages FOR DELETE 
    USING (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Guests can insert messages" ON public.messages;
CREATE POLICY "Guests can insert messages" 
    ON public.messages FOR INSERT 
    WITH CHECK (
        recipient_id IS NOT NULL 
        AND CHAR_LENGTH(content) >= 1 
        AND CHAR_LENGTH(content) <= 1000 
        AND category IN ('secret', 'confession', 'compliment', 'fun', 'advice', 'friendship', 'other')
    );

-- Private Message Senders (Metadata restricted, only accessible via SECURITY DEFINER)
ALTER TABLE public.private_message_senders ENABLE ROW LEVEL SECURITY;

-- Message Reactions
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Recipients can view reactions on own messages" ON public.message_reactions;
CREATE POLICY "Recipients can view reactions on own messages" 
    ON public.message_reactions FOR SELECT 
    USING (
        auth.uid() = user_id 
        OR auth.uid() IN (SELECT recipient_id FROM public.messages WHERE id = message_id)
    );

DROP POLICY IF EXISTS "Users can manage own reactions" ON public.message_reactions;
CREATE POLICY "Users can manage own reactions" 
    ON public.message_reactions FOR ALL 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- Message Replies
ALTER TABLE public.message_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view replies" ON public.message_replies;
CREATE POLICY "Public can view replies" 
    ON public.message_replies FOR SELECT 
    USING (true);

DROP POLICY IF EXISTS "Recipient can insert replies" ON public.message_replies;
CREATE POLICY "Recipient can insert replies" 
    ON public.message_replies FOR INSERT 
    WITH CHECK (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Recipient can update replies" ON public.message_replies;
CREATE POLICY "Recipient can update replies" 
    ON public.message_replies FOR UPDATE 
    USING (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Recipient can delete replies" ON public.message_replies;
CREATE POLICY "Recipient can delete replies" 
    ON public.message_replies FOR DELETE 
    USING (auth.uid() = recipient_id);

-- User Blocks
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User can manage own blocks" ON public.user_blocks;
CREATE POLICY "User can manage own blocks" 
    ON public.user_blocks FOR ALL 
    USING (auth.uid() = blocker_id) 
    WITH CHECK (auth.uid() = blocker_id);

-- Abuse Reports
ALTER TABLE public.abuse_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit abuse report" ON public.abuse_reports;
CREATE POLICY "Anyone can submit abuse report" 
    ON public.abuse_reports FOR INSERT 
    WITH CHECK (CHAR_LENGTH(reason) > 0);

DROP POLICY IF EXISTS "Admins can view reports" ON public.abuse_reports;
CREATE POLICY "Admins can view reports" 
    ON public.abuse_reports FOR SELECT 
    USING (
        auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'moderator'))
    );

-- Polls & Time Capsules & Notifications
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Polls public view" ON public.polls;
CREATE POLICY "Polls public view" ON public.polls FOR SELECT USING (true);
DROP POLICY IF EXISTS "User manage own polls" ON public.polls;
CREATE POLICY "User manage own polls" ON public.polls FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Poll votes public view" ON public.poll_votes;
CREATE POLICY "Poll votes public view" ON public.poll_votes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone vote" ON public.poll_votes;
CREATE POLICY "Anyone vote" ON public.poll_votes FOR INSERT WITH CHECK (true);

ALTER TABLE public.time_capsules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User view capsules" ON public.time_capsules;
CREATE POLICY "User view capsules" ON public.time_capsules FOR SELECT 
    USING (auth.uid() = user_id OR (unlock_at <= NOW() AND is_unlocked = true));
DROP POLICY IF EXISTS "User manage capsules" ON public.time_capsules;
CREATE POLICY "User manage capsules" ON public.time_capsules FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User view own notifications" ON public.notifications;
CREATE POLICY "User view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "User update own notifications" ON public.notifications;
CREATE POLICY "User update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "User delete own notifications" ON public.notifications;
CREATE POLICY "User delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- 12. FUNCTIONS AND TRIGGERS

-- Function: Automatically initialize profile when a user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_raw_username TEXT;
    v_clean_username TEXT;
    v_display_name TEXT;
BEGIN
    v_raw_username := COALESCE(
        NEW.raw_user_meta_data->>'username',
        SPLIT_PART(NEW.email, '@', 1)
    );
    v_clean_username := LOWER(REGEXP_REPLACE(v_raw_username, '[^a-zA-Z0-9_]', '', 'g'));
    
    IF LENGTH(v_clean_username) < 3 THEN
        v_clean_username := 'user_' || SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 6);
    END IF;
    IF LENGTH(v_clean_username) > 30 THEN
        v_clean_username := SUBSTRING(v_clean_username, 1, 30);
    END IF;

    -- Avoid username collision
    IF EXISTS (SELECT 1 FROM public.profiles WHERE LOWER(username) = v_clean_username AND id <> NEW.id) THEN
        v_clean_username := SUBSTRING(v_clean_username, 1, 24) || '_' || FLOOR(RANDOM() * 899 + 100)::text;
    END IF;

    v_display_name := COALESCE(
        NEW.raw_user_meta_data->>'display_name',
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        SPLIT_PART(NEW.email, '@', 1),
        v_clean_username
    );

    INSERT INTO public.profiles (
        id,
        username,
        display_name,
        avatar_url,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        v_clean_username,
        v_display_name,
        NEW.raw_user_meta_data->>'avatar_url',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        display_name = COALESCE(EXCLUDED.display_name, public.profiles.display_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        updated_at = NOW();

    INSERT INTO public.inbox_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function: Resolve email by username securely for sign-in
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
RETURNS TEXT AS $$
DECLARE
    v_clean_username TEXT;
    v_email TEXT;
BEGIN
    v_clean_username := LOWER(LTRIM(TRIM(p_username), '@'));
    
    SELECT u.email INTO v_email
    FROM auth.users u
    JOIN public.profiles p ON p.id = u.id
    WHERE LOWER(p.username) = v_clean_username
    LIMIT 1;

    RETURN v_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO anon, authenticated, service_role;

-- Function: Secure guest-first anonymous message submission
CREATE OR REPLACE FUNCTION public.submit_anonymous_message(
    p_recipient_username TEXT,
    p_category TEXT,
    p_content TEXT,
    p_client_hash TEXT DEFAULT NULL,
    p_user_agent_hash TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_clean_username TEXT;
    v_clean_content TEXT;
    v_recipient public.profiles%ROWTYPE;
    v_new_message_id UUID;
    v_recent_count INT;
BEGIN
    v_clean_content := TRIM(p_content);
    v_clean_username := LOWER(LTRIM(TRIM(p_recipient_username), '@'));

    IF v_clean_content IS NULL OR LENGTH(v_clean_content) < 1 THEN
        RETURN jsonb_build_object('success', false, 'error', 'চিঠি ফাঁকা রাখা যাবে না (Letter content cannot be empty).');
    END IF;

    IF LENGTH(v_clean_content) > 1000 THEN
        RETURN jsonb_build_object('success', false, 'error', 'চিঠির দৈর্ঘ্য সর্বোচ্চ ১০০০ অক্ষর হতে পারে।');
    END IF;

    IF p_category NOT IN ('secret', 'confession', 'compliment', 'fun', 'advice', 'friendship', 'other') THEN
        RETURN jsonb_build_object('success', false, 'error', 'অবৈধ চিঠির বিভাগ নির্বাচন করা হয়েছে।');
    END IF;

    SELECT * INTO v_recipient
    FROM public.profiles
    WHERE LOWER(username) = v_clean_username;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'এই ইউজারনেমে কোনো চিঠি বাক্স পাওয়া যায়নি।');
    END IF;

    IF v_recipient.is_banned = TRUE THEN
        RETURN jsonb_build_object('success', false, 'error', 'এই অ্যাকাউন্টটি স্থগিত রাখা হয়েছে (This account is suspended).');
    END IF;

    IF v_recipient.inbox_paused = TRUE THEN
        RETURN jsonb_build_object('success', false, 'error', 'এই চিঠি বাক্সটি বর্তমানে সাময়িকভাবে বন্ধ আছে (This letterbox is paused).');
    END IF;

    -- Check if blocked by recipient
    IF p_client_hash IS NOT NULL AND p_client_hash <> '' THEN
        IF EXISTS (
            SELECT 1 FROM public.user_blocks 
            WHERE blocker_id = v_recipient.id AND blocked_identifier = p_client_hash
        ) THEN
            RETURN jsonb_build_object('success', false, 'error', 'আপনি এই চিঠি বাক্সে চিঠি পাঠাতে পারবেন না।');
        END IF;

        -- Rate limit check: max 12 messages per 10 minutes per client hash
        SELECT COUNT(*) INTO v_recent_count
        FROM public.private_message_senders
        WHERE client_hash = p_client_hash AND created_at > NOW() - INTERVAL '10 minutes';

        IF v_recent_count >= 12 THEN
            RETURN jsonb_build_object('success', false, 'error', 'খুব দ্রুত চিঠি পাঠানো হয়েছে। অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করুন।');
        END IF;
    END IF;

    -- Insert message
    INSERT INTO public.messages (recipient_id, category, content)
    VALUES (v_recipient.id, p_category, v_clean_content)
    RETURNING id INTO v_new_message_id;

    -- Store restricted sender metadata separately
    INSERT INTO public.private_message_senders (message_id, client_hash, user_agent_hash)
    VALUES (v_new_message_id, p_client_hash, p_user_agent_hash);

    -- Insert in-app notification for recipient
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
        v_recipient.id,
        'new_letter',
        'নতুন বেনামী চিঠি 📬',
        'আপনার চিঠি বাক্সে একটি নতুন চিঠি এসেছে!',
        jsonb_build_object('message_id', v_new_message_id, 'category', p_category)
    );

    RETURN jsonb_build_object(
        'success', true,
        'message_id', v_new_message_id,
        'recipient_username', v_recipient.username,
        'delivered_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.submit_anonymous_message(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- Function: Fetch inbox messages securely
CREATE OR REPLACE FUNCTION public.fetch_inbox_messages(p_recipient_id UUID)
RETURNS SETOF public.messages AS $$
BEGIN
    IF auth.uid() IS NOT NULL AND auth.uid() <> p_recipient_id THEN
        RAISE EXCEPTION 'Unauthorized inbox access';
    END IF;

    RETURN QUERY
    SELECT * FROM public.messages
    WHERE recipient_id = p_recipient_id
    ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.fetch_inbox_messages(UUID) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fetch_inbox_messages_v2(p_recipient_id UUID, p_username TEXT DEFAULT NULL)
RETURNS SETOF public.messages AS $$
DECLARE
    v_target_id UUID := p_recipient_id;
BEGIN
    IF v_target_id IS NULL AND p_username IS NOT NULL THEN
        SELECT id INTO v_target_id FROM public.profiles WHERE LOWER(username) = LOWER(LTRIM(TRIM(p_username), '@'));
    END IF;

    IF auth.uid() IS NOT NULL AND auth.uid() <> v_target_id THEN
        RAISE EXCEPTION 'Unauthorized inbox access';
    END IF;

    RETURN QUERY
    SELECT * FROM public.messages
    WHERE recipient_id = v_target_id
    ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.fetch_inbox_messages_v2(UUID, TEXT) TO anon, authenticated, service_role;

-- 13. REALTIME REPLICATION CONFIGURATION
ALTER TABLE public.messages REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
END $$;
