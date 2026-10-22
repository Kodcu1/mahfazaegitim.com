-- ==============================================================================
-- 0023: Fix Parent Meetings Table, RLS Policies, and Role Security
-- ==============================================================================

-- 1. Ensure parent_meetings table has all expected columns and constraints
CREATE TABLE IF NOT EXISTS public.parent_meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    meeting_date DATE NOT NULL,
    meeting_time TEXT,
    meeting_type TEXT DEFAULT 'online',
    student_name TEXT,
    parent_name TEXT,
    parent_phone TEXT,
    person_contacted TEXT,
    teacher_opinions TEXT,
    academic_evaluation TEXT,
    raw_notes TEXT,
    refined_notes TEXT,
    psychological_status TEXT,
    coach_recommendations TEXT,
    action_plan TEXT,
    next_meeting_date DATE,
    status TEXT DEFAULT 'Planlandı',
    report JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Ensure id has default gen_random_uuid() if table was created without default
ALTER TABLE public.parent_meetings ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Enable Row Level Security
ALTER TABLE public.parent_meetings ENABLE ROW LEVEL SECURITY;

-- 2. SELECT Policy:
-- - Admins can read all parent meetings
-- - Coaches can read meetings where they are the coach or assigned to the student
-- - Students can read meetings for themselves
-- - Parents can read meetings for their linked children
DROP POLICY IF EXISTS "parent_meetings_select_policy" ON public.parent_meetings;
DROP POLICY IF EXISTS "parent_meetings_select" ON public.parent_meetings;
CREATE POLICY "parent_meetings_select" ON public.parent_meetings
    FOR SELECT TO authenticated
    USING (
        coach_id = auth.uid()
        OR student_id = auth.uid()
        OR public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.coach_students cs
            WHERE cs.coach_id = auth.uid() AND cs.student_id = parent_meetings.student_id
        )
        OR EXISTS (
            SELECT 1 FROM public.coach_student_links csl
            WHERE csl.coach_id = auth.uid() AND csl.student_id = parent_meetings.student_id
        )
        OR public.is_parent_of_student(student_id)
    );

-- 3. INSERT Policy:
-- - Admins can insert any meeting with valid coach and student
-- - Coaches can insert ONLY when coach_id = auth.uid() AND student is assigned to them
DROP POLICY IF EXISTS "parent_meetings_insert_policy" ON public.parent_meetings;
DROP POLICY IF EXISTS "parent_meetings_insert" ON public.parent_meetings;
CREATE POLICY "parent_meetings_insert" ON public.parent_meetings
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_admin()
        OR (
            coach_id = auth.uid()
            AND (
                EXISTS (
                    SELECT 1 FROM public.coach_students cs
                    WHERE cs.coach_id = auth.uid() AND cs.student_id = parent_meetings.student_id
                )
                OR EXISTS (
                    SELECT 1 FROM public.coach_student_links csl
                    WHERE csl.coach_id = auth.uid() AND csl.student_id = parent_meetings.student_id
                )
            )
        )
    );

-- 4. UPDATE Policy:
-- - Admins can update any meeting
-- - Coaches can update meetings where coach_id = auth.uid()
DROP POLICY IF EXISTS "parent_meetings_update_policy" ON public.parent_meetings;
DROP POLICY IF EXISTS "parent_meetings_update" ON public.parent_meetings;
CREATE POLICY "parent_meetings_update" ON public.parent_meetings
    FOR UPDATE TO authenticated
    USING (
        coach_id = auth.uid()
        OR public.is_admin()
    )
    WITH CHECK (
        coach_id = auth.uid()
        OR public.is_admin()
    );

-- 5. DELETE Policy:
-- - Admins can delete any meeting
-- - Coaches can delete meetings where coach_id = auth.uid()
DROP POLICY IF EXISTS "parent_meetings_delete_policy" ON public.parent_meetings;
DROP POLICY IF EXISTS "parent_meetings_delete" ON public.parent_meetings;
CREATE POLICY "parent_meetings_delete" ON public.parent_meetings
    FOR DELETE TO authenticated
    USING (
        coach_id = auth.uid()
        OR public.is_admin()
    );
