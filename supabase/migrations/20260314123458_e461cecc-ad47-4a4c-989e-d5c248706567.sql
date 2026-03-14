-- Add photos column to daily_progress_reports
ALTER TABLE public.daily_progress_reports
ADD COLUMN photos text[] NOT NULL DEFAULT '{}';