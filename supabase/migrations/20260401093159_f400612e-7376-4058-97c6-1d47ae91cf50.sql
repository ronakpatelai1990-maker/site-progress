
-- Add site_id to inventory (nullable for existing unassigned items)
ALTER TABLE public.inventory ADD COLUMN site_id uuid REFERENCES public.sites(id) ON DELETE CASCADE;

-- Create index for fast site-based lookups
CREATE INDEX idx_inventory_site_id ON public.inventory(site_id);
