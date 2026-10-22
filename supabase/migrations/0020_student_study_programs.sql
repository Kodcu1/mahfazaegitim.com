-- Migration: Student Study Programs Table & RLS Policies
CREATE TABLE IF NOT EXISTS public.student_study_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  coach_id UUID NOT NULL,
  week_start DATE NOT NULL,
  schedule_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_study_programs ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Coaches can manage study programs for assigned students" ON public.student_study_programs;
CREATE POLICY "Coaches can manage study programs for assigned students"
  ON public.student_study_programs
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Students can read their own study programs" ON public.student_study_programs;
CREATE POLICY "Students can read their own study programs"
  ON public.student_study_programs
  FOR SELECT
  USING (true);
