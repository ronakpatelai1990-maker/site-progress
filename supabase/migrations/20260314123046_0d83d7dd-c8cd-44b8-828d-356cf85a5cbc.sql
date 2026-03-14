-- Daily progress reports table
CREATE TABLE public.daily_progress_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  report_date date NOT NULL DEFAULT CURRENT_DATE,
  work_description text NOT NULL,
  manpower jsonb NOT NULL DEFAULT '[]'::jsonb,
  materials_used jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(site_id, report_date, created_by)
);

-- Enable RLS
ALTER TABLE public.daily_progress_reports ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "Authenticated users can read daily reports"
ON public.daily_progress_reports FOR SELECT
TO authenticated
USING (true);

-- Admins and engineers can insert
CREATE POLICY "Admins and engineers can insert daily reports"
ON public.daily_progress_reports FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'engineer'))
);

-- Users can update own reports
CREATE POLICY "Users can update own daily reports"
ON public.daily_progress_reports FOR UPDATE
TO authenticated
USING (auth.uid() = created_by);

-- Users can delete own reports, admins can delete any
CREATE POLICY "Users can delete own daily reports"
ON public.daily_progress_reports FOR DELETE
TO authenticated
USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

-- Function to auto-deduct inventory when a daily report is created
CREATE OR REPLACE FUNCTION public.deduct_inventory_on_daily_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  material jsonb;
  inv_id uuid;
  qty numeric;
BEGIN
  IF NEW.materials_used IS NOT NULL AND jsonb_array_length(NEW.materials_used) > 0 THEN
    FOR material IN SELECT * FROM jsonb_array_elements(NEW.materials_used)
    LOOP
      inv_id := (material->>'inventory_id')::uuid;
      qty := (material->>'qty_used')::numeric;

      -- Deduct from available_qty
      UPDATE public.inventory
      SET available_qty = GREATEST(available_qty - qty, 0),
          updated_at = now()
      WHERE id = inv_id;

      -- Record in material_usage
      INSERT INTO public.material_usage (inventory_id, task_id, qty_used, recorded_by)
      VALUES (
        inv_id,
        COALESCE(
          (SELECT id FROM public.tasks WHERE site_id = NEW.site_id AND status != 'completed' LIMIT 1),
          (SELECT id FROM public.tasks WHERE site_id = NEW.site_id LIMIT 1)
        ),
        qty,
        NEW.created_by
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_deduct_inventory_on_daily_report
AFTER INSERT ON public.daily_progress_reports
FOR EACH ROW
EXECUTE FUNCTION public.deduct_inventory_on_daily_report();