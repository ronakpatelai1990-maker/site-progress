
-- Add structured report columns
ALTER TABLE public.daily_progress_reports
  ADD COLUMN IF NOT EXISTS weather text DEFAULT '',
  ADD COLUMN IF NOT EXISTS workers_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS work_hours numeric DEFAULT 8,
  ADD COLUMN IF NOT EXISTS work_completed jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS issues text DEFAULT '',
  ADD COLUMN IF NOT EXISTS tomorrow_plan text DEFAULT '',
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS bungalow_no text DEFAULT '',
  ADD COLUMN IF NOT EXISTS room_no text DEFAULT '';

-- Add unique constraint for one report per day per site
CREATE UNIQUE INDEX IF NOT EXISTS unique_daily_report_per_site
  ON public.daily_progress_reports (site_id, report_date)
  WHERE status = 'submitted';
