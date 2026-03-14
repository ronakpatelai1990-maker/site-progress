
-- Delete policies for tasks (admins/engineers can delete)
CREATE POLICY "Admins and engineers can delete tasks"
  ON public.tasks FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'engineer')
  );

-- Delete policies for sites (admins can delete, engineers can delete their own)
CREATE POLICY "Admins can delete sites"
  ON public.sites FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Engineers can delete their sites"
  ON public.sites FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'engineer') AND engineer_id = auth.uid());

-- Update policy for inventory (admins can update)
CREATE POLICY "Admins can update inventory"
  ON public.inventory FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Delete policy for inventory (admins only)
CREATE POLICY "Admins can delete inventory"
  ON public.inventory FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Insert policy for sites (engineers can create)
CREATE POLICY "Engineers can create sites"
  ON public.sites FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'engineer'));

-- Update policy for sites (admins can update any)
CREATE POLICY "Admins can update sites"
  ON public.sites FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Update policy for sites (engineers can update their own)
CREATE POLICY "Engineers can update their sites"
  ON public.sites FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'engineer') AND engineer_id = auth.uid());
