-- 20260523000000_get_auth_user_by_email.sql
-- Custom secure RPC function to check if an email exists in the private auth.users table 
-- and retrieve its metadata. Executes with SECURITY DEFINER to bypass public schema access restrictions.

CREATE OR REPLACE FUNCTION public.get_auth_user_by_email(email_to_check text)
RETURNS TABLE (
  id uuid,
  email varchar,
  user_metadata jsonb,
  created_at timestamptz
)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email::varchar,
    u.raw_user_meta_data::jsonb as user_metadata,
    u.created_at
  FROM auth.users u
  WHERE u.email = email_to_check;
END;
$$ LANGUAGE plpgsql;
