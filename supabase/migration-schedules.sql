-- ==============================================================================
-- School Club Attendance - Migration: Weekly Schedules & Grade Slots
-- Copy and paste this into Supabase SQL Editor and click RUN
-- ==============================================================================

-- 1. Create club_schedules table
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

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_club_schedules_club ON public.club_schedules(club_id);
CREATE INDEX IF NOT EXISTS idx_club_schedules_day ON public.club_schedules(day_of_week);

-- 3. Row Level Security Policy
ALTER TABLE public.club_schedules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Public access for club_schedules" ON public.club_schedules;
    CREATE POLICY "Public access for club_schedules" ON public.club_schedules FOR ALL USING (true) WITH CHECK (true);
END $$;
