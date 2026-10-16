-- ==============================================================================
-- SUPABASE SECURITY HARDENING & RATE LIMITING MIGRATION
-- Run this in your Supabase SQL Editor to lock down database security.
-- ==============================================================================

-- 1. Create a persistent rate_limits table for serverless brute-force protection
CREATE TABLE IF NOT EXISTS public.rate_limits (
    key TEXT PRIMARY KEY,
    points INT NOT NULL DEFAULT 1,
    expire_at TIMESTAMPTZ NOT NULL
);

-- Index for clean garbage-collection lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_expire_at ON public.rate_limits(expire_at);

-- Enable RLS on rate_limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- 2. LOCK DOWN ROW LEVEL SECURITY (RLS)
-- Deny all direct public/anon access. 
-- Only backend API routes using the SUPABASE_SERVICE_ROLE_KEY can access these tables.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

-- Drop insecure public access policies if they exist
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public access for users" ON public.users;
    DROP POLICY IF EXISTS "Public access for club_members" ON public.club_members;
    DROP POLICY IF EXISTS "Public access for sessions" ON public.sessions;
    DROP POLICY IF EXISTS "Public access for attendance" ON public.attendance;
    DROP POLICY IF EXISTS "Public access for club_schedules" ON public.club_schedules;
    DROP POLICY IF EXISTS "Public access for clubs" ON public.clubs;
    DROP POLICY IF EXISTS "Public access for rate_limits" ON public.rate_limits;
END $$;

-- Allow ONLY authenticated service role full access to all tables
DO $$
BEGIN
    DROP POLICY IF EXISTS "Service role full access on users" ON public.users;
    CREATE POLICY "Service role full access on users" ON public.users
        FOR ALL TO service_role USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Service role full access on club_members" ON public.club_members;
    CREATE POLICY "Service role full access on club_members" ON public.club_members
        FOR ALL TO service_role USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Service role full access on sessions" ON public.sessions;
    CREATE POLICY "Service role full access on sessions" ON public.sessions
        FOR ALL TO service_role USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Service role full access on attendance" ON public.attendance;
    CREATE POLICY "Service role full access on attendance" ON public.attendance
        FOR ALL TO service_role USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Service role full access on club_schedules" ON public.club_schedules;
    CREATE POLICY "Service role full access on club_schedules" ON public.club_schedules
        FOR ALL TO service_role USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Service role full access on clubs" ON public.clubs;
    CREATE POLICY "Service role full access on clubs" ON public.clubs
        FOR ALL TO service_role USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Service role full access on rate_limits" ON public.rate_limits;
    CREATE POLICY "Service role full access on rate_limits" ON public.rate_limits
        FOR ALL TO service_role USING (true) WITH CHECK (true);
END $$;

-- 3. STORAGE BUCKET HARDENING
-- Allow public SELECT (read/download) so avatars & photos render on dashboards via CDN
-- Deny direct anon INSERT/UPDATE/DELETE so all uploads MUST pass through Next.js /api/upload
DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow public read on avatars" ON storage.objects;
    CREATE POLICY "Allow public read on avatars" ON storage.objects
        FOR SELECT TO public
        USING (bucket_id = 'avatars');

    DROP POLICY IF EXISTS "Allow public read on attendance-photos" ON storage.objects;
    CREATE POLICY "Allow public read on attendance-photos" ON storage.objects
        FOR SELECT TO public
        USING (bucket_id = 'attendance-photos');

    DROP POLICY IF EXISTS "Allow service role full access on storage" ON storage.objects;
    CREATE POLICY "Allow service role full access on storage" ON storage.objects
        FOR ALL TO service_role
        USING (true)
        WITH CHECK (true);
END $$;
