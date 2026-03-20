
-- Add tracking columns to inventory
ALTER TABLE public.inventory
ADD COLUMN IF NOT EXISTS total_used numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_used_date date,
ADD COLUMN IF NOT EXISTS last_used_quantity numeric;

-- Create trigger to restore inventory when daily report is deleted
CREATE OR REPLACE FUNCTION public.restore_inventory_on_daily_report_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  material jsonb;
  inv_id uuid;
  qty numeric;
BEGIN
  IF OLD.materials_used IS NOT NULL AND jsonb_array_length(OLD.materials_used) > 0 THEN
    FOR material IN SELECT * FROM jsonb_array_elements(OLD.materials_used)
    LOOP
      inv_id := (material->>'inventory_id')::uuid;
      qty := (material->>'qty_used')::numeric;

      UPDATE public.inventory
      SET available_qty = available_qty + qty,
          total_used = GREATEST(total_used - qty, 0),
          updated_at = now()
      WHERE id = inv_id;
    END LOOP;
  END IF;
  RETURN OLD;
END;
$$;

-- Create trigger to adjust inventory when daily report is updated (restore old, deduct new)
CREATE OR REPLACE FUNCTION public.adjust_inventory_on_daily_report_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  material jsonb;
  inv_id uuid;
  qty numeric;
BEGIN
  -- Restore old materials
  IF OLD.materials_used IS NOT NULL AND jsonb_array_length(OLD.materials_used) > 0 THEN
    FOR material IN SELECT * FROM jsonb_array_elements(OLD.materials_used)
    LOOP
      inv_id := (material->>'inventory_id')::uuid;
      qty := (material->>'qty_used')::numeric;
      UPDATE public.inventory
      SET available_qty = available_qty + qty,
          total_used = GREATEST(total_used - qty, 0),
          updated_at = now()
      WHERE id = inv_id;
    END LOOP;
  END IF;

  -- Deduct new materials
  IF NEW.materials_used IS NOT NULL AND jsonb_array_length(NEW.materials_used) > 0 THEN
    FOR material IN SELECT * FROM jsonb_array_elements(NEW.materials_used)
    LOOP
      inv_id := (material->>'inventory_id')::uuid;
      qty := (material->>'qty_used')::numeric;
      UPDATE public.inventory
      SET available_qty = GREATEST(available_qty - qty, 0),
          total_used = total_used + qty,
          last_used_date = CURRENT_DATE,
          last_used_quantity = qty,
          updated_at = now()
      WHERE id = inv_id;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- Update the existing deduction function to also set total_used, last_used_date, last_used_quantity
CREATE OR REPLACE FUNCTION public.deduct_inventory_on_daily_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

      UPDATE public.inventory
      SET available_qty = GREATEST(available_qty - qty, 0),
          total_used = total_used + qty,
          last_used_date = CURRENT_DATE,
          last_used_quantity = qty,
          updated_at = now()
      WHERE id = inv_id;

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

-- Create the triggers (drop if exists first)
DROP TRIGGER IF EXISTS trg_restore_inventory_on_report_delete ON public.daily_progress_reports;
CREATE TRIGGER trg_restore_inventory_on_report_delete
  BEFORE DELETE ON public.daily_progress_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.restore_inventory_on_daily_report_delete();

DROP TRIGGER IF EXISTS trg_adjust_inventory_on_report_update ON public.daily_progress_reports;
CREATE TRIGGER trg_adjust_inventory_on_report_update
  BEFORE UPDATE OF materials_used ON public.daily_progress_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.adjust_inventory_on_daily_report_update();

-- Enable realtime for material_usage to track usage history
ALTER PUBLICATION supabase_realtime ADD TABLE public.material_usage;
