-- 20260523010000_sync_display_name.sql
-- 1. Create a secure trigger function to automatically sync public.users (user_name, location) to auth.users raw_user_meta_data
CREATE OR REPLACE FUNCTION public.sync_user_to_auth_metadata()
RETURNS trigger AS $$
BEGIN
  UPDATE auth.users
  SET raw_user_meta_data = 
    coalesce(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'user_name', NEW.user_name,
      'full_name', NEW.user_name,
      'display_name', NEW.user_name,
      'location', coalesce(NEW.location, '')
    )
  WHERE id = NEW.auth_user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Bind the trigger to the public.users table for AFTER INSERT OR UPDATE
DROP TRIGGER IF EXISTS trg_sync_user_to_auth_metadata ON public.users;
CREATE TRIGGER trg_sync_user_to_auth_metadata
  AFTER INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_to_auth_metadata();

-- 3. One-time retrospective update to sync all existing users in the database
UPDATE auth.users
SET raw_user_meta_data = 
  coalesce(raw_user_meta_data, '{}'::jsonb) || 
  jsonb_build_object(
    'user_name', p.user_name,
    'full_name', p.user_name,
    'display_name', p.user_name,
    'location', coalesce(p.location, '')
  )
FROM public.users p
WHERE auth.users.id = p.auth_user_id;
