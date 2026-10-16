-- ==============================================================================
-- School Club Attendance System - Complete Supabase PostgreSQL Schema
-- Run this script in the Supabase SQL Editor (1-click setup)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABLES

-- Clubs
CREATE TABLE IF NOT EXISTS public.clubs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Users (Students and Teachers)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('student', 'teacher')),
    grade INTEGER CHECK (grade >= 6 AND grade <= 12),
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Club Memberships
CREATE TABLE IF NOT EXISTS public.club_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role_in_club TEXT NOT NULL CHECK (role_in_club IN ('student', 'leader')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_club_user UNIQUE (club_id, user_id)
);

-- Attendance Sessions
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_open BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Attendance Submissions
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    photo_url TEXT,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_session_student UNIQUE (session_id, student_id)
);

-- Weekly Club Schedules & Grade Slots
CREATE TABLE IF NOT EXISTS public.club_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    day_of_week TEXT NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    min_grade INTEGER NOT NULL CHECK (min_grade >= 6 AND min_grade <= 12),
    max_grade INTEGER NOT NULL CHECK (max_grade >= 6 AND max_grade <= 12 AND max_grade >= min_grade),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. INDEXES FOR HIGH-PERFORMANCE QUERIES
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);
CREATE INDEX IF NOT EXISTS idx_club_members_user ON public.club_members(user_id);
CREATE INDEX IF NOT EXISTS idx_club_members_club ON public.club_members(club_id);
CREATE INDEX IF NOT EXISTS idx_sessions_club ON public.sessions(club_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON public.sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_attendance_session ON public.attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_club_schedules_club ON public.club_schedules(club_id);
CREATE INDEX IF NOT EXISTS idx_club_schedules_day ON public.club_schedules(day_of_week);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- Enables RLS and grants full access to service/anon backend server queries.
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_schedules ENABLE ROW LEVEL SECURITY;

-- Permissive policies for the custom JWT/server application layer
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public access for clubs" ON public.clubs;
    CREATE POLICY "Public access for clubs" ON public.clubs FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access for users" ON public.users;
    CREATE POLICY "Public access for users" ON public.users FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access for club_members" ON public.club_members;
    CREATE POLICY "Public access for club_members" ON public.club_members FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access for sessions" ON public.sessions;
    CREATE POLICY "Public access for sessions" ON public.sessions FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access for attendance" ON public.attendance;
    CREATE POLICY "Public access for attendance" ON public.attendance FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access for club_schedules" ON public.club_schedules;
    CREATE POLICY "Public access for club_schedules" ON public.club_schedules FOR ALL USING (true) WITH CHECK (true);
END $$;

    DROP POLICY IF EXISTS "Public access for sessions" ON public.sessions;
    CREATE POLICY "Public access for sessions" ON public.sessions FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access for attendance" ON public.attendance;
    CREATE POLICY "Public access for attendance" ON public.attendance FOR ALL USING (true) WITH CHECK (true);
END $$;

-- 5. SEED MASTER CLUB LIST
INSERT INTO public.clubs (name)
VALUES
    ('Robotics Club'),
    ('Debate Club'),
    ('Basketball Club'),
    ('Art & Design Club'),
    ('Coding Club'),
    ('Music Club')
ON CONFLICT (name) DO NOTHING;

-- 6. PUBLIC STORAGE BUCKETS & POLICIES (Avatars & Attendance Photos)
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('avatars', 'avatars', true),
    ('attendance-photos', 'attendance-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS Policies for avatars
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
    CREATE POLICY "Public read avatars" ON storage.objects
        FOR SELECT USING (bucket_id = 'avatars');

    DROP POLICY IF EXISTS "Public insert avatars" ON storage.objects;
    CREATE POLICY "Public insert avatars" ON storage.objects
        FOR INSERT WITH CHECK (bucket_id = 'avatars');

    DROP POLICY IF EXISTS "Public update avatars" ON storage.objects;
    CREATE POLICY "Public update avatars" ON storage.objects
        FOR UPDATE USING (bucket_id = 'avatars');
END $$;

-- Storage RLS Policies for attendance photos
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public read attendance photos" ON storage.objects;
    CREATE POLICY "Public read attendance photos" ON storage.objects
        FOR SELECT USING (bucket_id = 'attendance-photos');

    DROP POLICY IF EXISTS "Public insert attendance photos" ON storage.objects;
    CREATE POLICY "Public insert attendance photos" ON storage.objects
        FOR INSERT WITH CHECK (bucket_id = 'attendance-photos');

    DROP POLICY IF EXISTS "Public update attendance photos" ON storage.objects;
    CREATE POLICY "Public update attendance photos" ON storage.objects
        FOR UPDATE USING (bucket_id = 'attendance-photos');
END $$;
