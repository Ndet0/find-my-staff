-- findmystaff Teardown
-- WARNING: Destroys all app data and schema objects in the public schema.
-- Does NOT delete auth.users — sign-in accounts remain; profiles are removed.
--
-- Full reset workflow (run each file in order in the Supabase SQL Editor):
--   1. supabase/teardown.sql
--   2. supabase/schema.sql
--   3. supabase/seed.sql

-- Triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS validate_shift_assignment_trigger ON shifts;

-- Realtime publication
DROP PUBLICATION IF EXISTS supabase_realtime;

-- Functions (current + legacy names from earlier schema iterations)
DROP FUNCTION IF EXISTS public.check_provider_exists(text);
DROP FUNCTION IF EXISTS public.assign_shift(uuid, uuid);
DROP FUNCTION IF EXISTS public.accept_assignment(uuid);
DROP FUNCTION IF EXISTS public.decline_assignment(uuid);
DROP FUNCTION IF EXISTS public.cancel_shift(uuid);
DROP FUNCTION IF EXISTS public.show_interest(uuid);
DROP FUNCTION IF EXISTS public.mark_notification_read(uuid);
DROP FUNCTION IF EXISTS public.validate_shift_assignment();
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.accept_shift(uuid);
DROP FUNCTION IF EXISTS public.facility_unassign_shift(uuid);
DROP FUNCTION IF EXISTS public.provider_claim_shift(uuid);
DROP FUNCTION IF EXISTS public.provider_confirm_shift(uuid);
DROP FUNCTION IF EXISTS public.provider_decline_shift(uuid, text);
DROP FUNCTION IF EXISTS public.provider_express_interest(uuid, text);
DROP FUNCTION IF EXISTS public.touch_updated_at();
DROP FUNCTION IF EXISTS public.has_role();
DROP FUNCTION IF EXISTS public.is_email_rostered();
DROP FUNCTION IF EXISTS public.safe_specialty();
DROP FUNCTION IF EXISTS public.activate_provider_roster();
DROP FUNCTION IF EXISTS public.notify_shift_updated();
DROP FUNCTION IF EXISTS public.notify_new_shift_match();

-- Tables (child tables first)
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS shift_interests;
DROP TABLE IF EXISTS shift_history;
DROP TABLE IF EXISTS timesheets;
DROP TABLE IF EXISTS provider_reviews;
DROP TABLE IF EXISTS provider_credentials;
DROP TABLE IF EXISTS provider_availability;
DROP TABLE IF EXISTS provider_settings;
DROP TABLE IF EXISTS facility_settings;
DROP TABLE IF EXISTS facility_users;
DROP TABLE IF EXISTS shifts;
DROP TABLE IF EXISTS provider_facility_relationships;
DROP TABLE IF EXISTS providers;
DROP TABLE IF EXISTS facilities;
DROP TABLE IF EXISTS profiles;

-- Legacy tables from earlier schema iterations
DROP TABLE IF EXISTS provider_profiles;
DROP TABLE IF EXISTS provider_roster;
DROP TABLE IF EXISTS user_roles;

-- Enums (current + legacy)
DROP TYPE IF EXISTS notification_type;
DROP TYPE IF EXISTS shift_status;
DROP TYPE IF EXISTS employment_type;
DROP TYPE IF EXISTS specialty;
DROP TYPE IF EXISTS provider_role;
DROP TYPE IF EXISTS onboarding_status;
DROP TYPE IF EXISTS user_type;
DROP TYPE IF EXISTS app_notification_type;
DROP TYPE IF EXISTS app_role;
