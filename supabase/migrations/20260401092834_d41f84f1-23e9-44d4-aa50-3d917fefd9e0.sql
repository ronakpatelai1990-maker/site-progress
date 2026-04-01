
-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'task_assigned',
  read boolean NOT NULL DEFAULT false,
  related_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users can read own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Users can update own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- System can insert notifications (via trigger with security definer)
CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (true);

-- Users can delete own notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Trigger function: notify on task insert
CREATE OR REPLACE FUNCTION public.notify_task_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  site_name text;
BEGIN
  SELECT name INTO site_name FROM public.sites WHERE id = NEW.site_id;
  
  INSERT INTO public.notifications (user_id, title, message, type, related_id)
  VALUES (
    NEW.assigned_to,
    'New Task Assigned',
    'You have been assigned "' || NEW.title || '" at ' || COALESCE(site_name, 'Unknown Site'),
    'task_assigned',
    NEW.id
  );
  RETURN NEW;
END;
$$;

-- Trigger on task insert
CREATE TRIGGER on_task_created_notify
  AFTER INSERT ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_assigned();

-- Trigger function: notify on task reassignment
CREATE OR REPLACE FUNCTION public.notify_task_reassigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  site_name text;
BEGIN
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    SELECT name INTO site_name FROM public.sites WHERE id = NEW.site_id;
    
    INSERT INTO public.notifications (user_id, title, message, type, related_id)
    VALUES (
      NEW.assigned_to,
      'Task Reassigned to You',
      'You have been assigned "' || NEW.title || '" at ' || COALESCE(site_name, 'Unknown Site'),
      'task_assigned',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger on task update (reassignment)
CREATE TRIGGER on_task_reassigned_notify
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_reassigned();
