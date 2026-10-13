-- =================================================================================
-- มทร.ล้านนา เชียงราย Lifelong Learning - Supabase Database Schema
-- วิธีใช้: คัดลอกโค้ดทั้งหมดนี้ไปวางใน Supabase Dashboard -> SQL Editor แล้วกด Run
-- =================================================================================

CREATE TABLE IF NOT EXISTS public.trainee_applications (
  id BIGINT PRIMARY KEY,
  user_id BIGINT,
  course_id INTEGER NOT NULL,
  course_slug TEXT NOT NULL,
  course_title TEXT NOT NULL,
  course_duration TEXT NOT NULL,
  course_tuition INTEGER NOT NULL DEFAULT 0,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  national_id TEXT,
  occupation TEXT,
  experience TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  payment_amount INTEGER DEFAULT 0,
  payment_ref TEXT,
  paid_at TIMESTAMPTZ,
  attendance_progress INTEGER NOT NULL DEFAULT 0,
  attendance_status TEXT NOT NULL DEFAULT 'not_started',
  completed_at TIMESTAMPTZ,
  certificate_issued BOOLEAN NOT NULL DEFAULT FALSE,
  certificate_no TEXT,
  certificate_issued_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.trainee_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public full access to trainee_applications" ON public.trainee_applications;
CREATE POLICY "Allow public full access to trainee_applications"
  ON public.trainee_applications
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_trainee_applications_email ON public.trainee_applications(email);
CREATE INDEX IF NOT EXISTS idx_trainee_applications_certificate_no ON public.trainee_applications(certificate_no);
