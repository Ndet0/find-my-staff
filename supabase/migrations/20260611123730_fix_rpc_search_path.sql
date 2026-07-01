-- Fix malformed search_path on SECURITY DEFINER functions.
-- Previously set as a single schema named "public, pg_temp" instead of public + pg_temp.
ALTER FUNCTION public.assign_shift(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.mark_notification_read(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.accept_assignment(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.decline_assignment(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.cancel_shift(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.show_interest(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.check_provider_exists(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
