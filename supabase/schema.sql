-- findmystaff Supabase Schema
-- Run this in your Supabase SQL Editor

-- Enums
CREATE TYPE user_type AS ENUM ('facility', 'provider');
CREATE TYPE provider_role AS ENUM ('CNA', 'LPN', 'RN', 'NP');
CREATE TYPE specialty AS ENUM ('ICU', 'Emergency', 'Med-Surg', 'Telemetry', 'Long-Term Care', 'Family Medicine');
CREATE TYPE employment_type AS ENUM ('1099', 'W2');
CREATE TYPE shift_status AS ENUM ('open', 'pending', 'assigned');
CREATE TYPE notification_type AS ENUM ('assigned', 'cancelled', 'accepted', 'interest', 'declined');
CREATE TYPE onboarding_status AS ENUM ('invited', 'profile_complete', 'credentials_verified', 'active');

-- Core tables
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  user_type user_type NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cms_id TEXT,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  facility_type TEXT,
  rating NUMERIC,
  quality_score NUMERIC,
  contact_phone TEXT,
  contact_email TEXT,
  source_metadata JSONB,
  imported_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role provider_role NOT NULL,
  specialty specialty NOT NULL,
  phone TEXT,
  onboarding_status onboarding_status DEFAULT 'invited',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS provider_facility_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  employment_type employment_type NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(provider_id, facility_id)
);

CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  required_role provider_role NOT NULL,
  required_specialty specialty NOT NULL,
  hourly_pay_rate NUMERIC(10,2) NOT NULL,
  status shift_status DEFAULT 'open',
  assigned_provider_id UUID REFERENCES providers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shift_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(shift_id, provider_id)
);

-- Additional tables
CREATE TABLE IF NOT EXISTS facility_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS provider_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  credential_type TEXT NOT NULL CHECK (credential_type IN ('license', 'certification', 'background_check', 'drug_screen')),
  state TEXT,
  number TEXT NOT NULL,
  issued_at DATE,
  expires_at DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'expired', 'pending')),
  document_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS provider_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('available', 'unavailable', 'preferred')),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME,
  end_time TIME,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shift_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  previous_status shift_status,
  new_status shift_status NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS provider_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL UNIQUE REFERENCES providers(id) ON DELETE CASCADE,
  timezone TEXT DEFAULT 'America/New_York',
  notification_email BOOLEAN DEFAULT true,
  notification_sms BOOLEAN DEFAULT false,
  min_pay_rate NUMERIC,
  max_commute_miles INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS facility_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL UNIQUE REFERENCES facilities(id) ON DELETE CASCADE,
  timezone TEXT DEFAULT 'America/New_York',
  default_pay_rate NUMERIC,
  auto_assign BOOLEAN DEFAULT false,
  require_credentials BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS provider_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  break_minutes INTEGER,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'disputed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_facility_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Facilities policies (facility users can read/write)
CREATE POLICY "facilities_facility_all" ON facilities
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'facility')
  );
CREATE POLICY "facilities_provider_read" ON facilities
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'provider')
  );

-- Providers policies
CREATE POLICY "providers_facility_all" ON providers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'facility')
  );
CREATE POLICY "providers_provider_own" ON providers
  FOR SELECT USING (
    auth.uid() = auth_user_id
  );

-- Relationships policies
CREATE POLICY "relationships_facility_all" ON provider_facility_relationships
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'facility')
  );
CREATE POLICY "relationships_provider_read" ON provider_facility_relationships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM providers
      WHERE auth_user_id = auth.uid()
      AND id = provider_facility_relationships.provider_id
    )
  );

-- Shifts policies
CREATE POLICY "shifts_facility_all" ON shifts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'facility')
  );
CREATE POLICY "shifts_provider_own" ON shifts
  FOR SELECT USING (
    assigned_provider_id IN (
      SELECT id FROM providers WHERE auth_user_id = auth.uid()
    )
    OR (
      status = 'open'
      AND required_role IN (
        SELECT role FROM providers WHERE auth_user_id = auth.uid()
      )
    )
  );
CREATE POLICY "shifts_provider_update_own" ON shifts
  FOR UPDATE USING (
    assigned_provider_id IN (
      SELECT id FROM providers WHERE auth_user_id = auth.uid()
    )
  );

-- Notifications policies
CREATE POLICY "notifications_facility_all" ON notifications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'facility')
  );
CREATE POLICY "notifications_provider_own" ON notifications
  FOR SELECT USING (recipient_id = auth.uid());
CREATE POLICY "notifications_provider_update_own" ON notifications
  FOR UPDATE USING (recipient_id = auth.uid());

-- Shift interests policies
CREATE POLICY "shift_interests_facility_all" ON shift_interests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'facility')
  );
CREATE POLICY "shift_interests_provider_insert_own" ON shift_interests
  FOR INSERT WITH CHECK (
    provider_id IN (SELECT id FROM providers WHERE auth_user_id = auth.uid())
  );
CREATE POLICY "shift_interests_provider_read" ON shift_interests
  FOR SELECT USING (
    provider_id IN (SELECT id FROM providers WHERE auth_user_id = auth.uid())
  );

-- Facility users policies
CREATE POLICY "facility_users_facility_all" ON facility_users
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'facility')
  );
CREATE POLICY "facility_users_own" ON facility_users
  FOR SELECT USING (user_id = auth.uid());

-- Provider credentials policies
CREATE POLICY "provider_credentials_facility_all" ON provider_credentials
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'facility')
  );
CREATE POLICY "provider_credentials_own" ON provider_credentials
  FOR SELECT USING (
    provider_id IN (SELECT id FROM providers WHERE auth_user_id = auth.uid())
  );

-- Provider availability policies
CREATE POLICY "provider_availability_facility_read" ON provider_availability
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'facility')
  );
CREATE POLICY "provider_availability_own" ON provider_availability
  FOR ALL USING (
    provider_id IN (SELECT id FROM providers WHERE auth_user_id = auth.uid())
  );

-- Shift history policies
CREATE POLICY "shift_history_facility_all" ON shift_history
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'facility')
  );
CREATE POLICY "shift_history_provider_read" ON shift_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM shifts
      WHERE id = shift_history.shift_id
      AND assigned_provider_id IN (
        SELECT id FROM providers WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Provider settings policies
CREATE POLICY "provider_settings_facility_read" ON provider_settings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'facility')
  );
CREATE POLICY "provider_settings_own" ON provider_settings
  FOR ALL USING (
    provider_id IN (SELECT id FROM providers WHERE auth_user_id = auth.uid())
  );

-- Facility settings policies
CREATE POLICY "facility_settings_facility_all" ON facility_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'facility')
  );
CREATE POLICY "facility_settings_provider_read" ON facility_settings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'provider')
  );

-- Provider reviews policies
CREATE POLICY "provider_reviews_facility_all" ON provider_reviews
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'facility')
  );
CREATE POLICY "provider_reviews_provider_read" ON provider_reviews
  FOR SELECT USING (
    provider_id IN (SELECT id FROM providers WHERE auth_user_id = auth.uid())
  );

-- Timesheets policies
CREATE POLICY "timesheets_facility_all" ON timesheets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'facility')
  );
CREATE POLICY "timesheets_provider_own" ON timesheets
  FOR SELECT USING (
    provider_id IN (SELECT id FROM providers WHERE auth_user_id = auth.uid())
  );

-- RPC Functions
CREATE OR REPLACE FUNCTION check_provider_exists(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_provider RECORD;
BEGIN
  SELECT id, email, auth_user_id INTO v_provider
  FROM providers WHERE LOWER(email) = LOWER(p_email);

  IF v_provider IS NULL THEN
    RETURN jsonb_build_object('exists', false);
  END IF;

  RETURN jsonb_build_object('exists', true, 'provider_id', v_provider.id);
END;
$$;

CREATE OR REPLACE FUNCTION assign_shift(shift_id UUID, provider_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_facility_id UUID;
  v_required_role provider_role;
  v_required_specialty specialty;
  v_provider_role provider_role;
  v_provider_specialty specialty;
  v_relationship_exists BOOLEAN;
  v_user_type user_type;
BEGIN
  -- Check caller is facility user
  SELECT user_type INTO v_user_type FROM profiles WHERE id = auth.uid();
  IF v_user_type != 'facility' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only facility users can assign shifts');
  END IF;

  -- Get shift details
  SELECT facility_id, required_role, required_specialty
  INTO v_facility_id, v_required_role, v_required_specialty
  FROM shifts WHERE id = shift_id;

  IF v_facility_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Shift not found');
  END IF;

  -- Check provider exists and is related to facility
  SELECT EXISTS(
    SELECT 1 FROM provider_facility_relationships
    WHERE provider_id = assign_shift.provider_id AND facility_id = v_facility_id
  ) INTO v_relationship_exists;

  IF NOT v_relationship_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Provider is not related to this facility');
  END IF;

  -- Check provider role matches
  SELECT role, specialty INTO v_provider_role, v_provider_specialty
  FROM providers WHERE id = provider_id;

  IF v_provider_role != v_required_role THEN
    RETURN jsonb_build_object('success', false, 'error', 'Provider role does not match shift requirements');
  END IF;

  -- Update shift to pending
  UPDATE shifts SET
    assigned_provider_id = provider_id,
    status = 'pending',
    updated_at = now()
  WHERE id = shift_id;

  -- Create notification for provider
  INSERT INTO notifications (recipient_id, type, shift_id, message)
  SELECT
    auth_user_id,
    'assigned',
    shift_id,
    'You have been assigned to a new shift. Please accept or decline.'
  FROM providers
  WHERE id = provider_id AND auth_user_id IS NOT NULL;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION accept_assignment(p_shift_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_provider_id UUID;
  v_shift_status shift_status;
  v_assigned_provider_id UUID;
  v_facility_id UUID;
BEGIN
  -- Get provider id for current user
  SELECT id INTO v_provider_id
  FROM providers WHERE auth_user_id = auth.uid();

  IF v_provider_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Provider not found');
  END IF;

  -- Get shift details
  SELECT status, assigned_provider_id, facility_id
  INTO v_shift_status, v_assigned_provider_id, v_facility_id
  FROM shifts WHERE id = p_shift_id;

  IF v_shift_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Shift not found');
  END IF;

  IF v_shift_status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Shift is not pending assignment');
  END IF;

  IF v_assigned_provider_id != v_provider_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'This shift was not assigned to you');
  END IF;

  -- Update shift to assigned
  UPDATE shifts SET
    status = 'assigned',
    updated_at = now()
  WHERE id = p_shift_id;

  -- Create notification for facility users
  INSERT INTO notifications (recipient_id, type, shift_id, message)
  SELECT
    id,
    'accepted',
    p_shift_id,
    'A provider has accepted their shift assignment'
  FROM profiles
  WHERE user_type = 'facility';

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION decline_assignment(p_shift_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_provider_id UUID;
  v_shift_status shift_status;
  v_assigned_provider_id UUID;
  v_facility_id UUID;
BEGIN
  -- Get provider id for current user
  SELECT id INTO v_provider_id
  FROM providers WHERE auth_user_id = auth.uid();

  IF v_provider_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Provider not found');
  END IF;

  -- Get shift details
  SELECT status, assigned_provider_id, facility_id
  INTO v_shift_status, v_assigned_provider_id, v_facility_id
  FROM shifts WHERE id = p_shift_id;

  IF v_shift_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Shift not found');
  END IF;

  IF v_shift_status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Shift is not pending assignment');
  END IF;

  IF v_assigned_provider_id != v_provider_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'This shift was not assigned to you');
  END IF;

  -- Update shift back to open
  UPDATE shifts SET
    assigned_provider_id = NULL,
    status = 'open',
    updated_at = now()
  WHERE id = p_shift_id;

  -- Create notification for facility users
  INSERT INTO notifications (recipient_id, type, shift_id, message)
  SELECT
    id,
    'declined',
    p_shift_id,
    'A provider has declined their shift assignment'
  FROM profiles
  WHERE user_type = 'facility';

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION cancel_shift(p_shift_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_provider_id UUID;
  v_assigned_provider_id UUID;
  v_facility_id UUID;
BEGIN
  -- Get provider id for current user
  SELECT id INTO v_provider_id
  FROM providers WHERE auth_user_id = auth.uid();

  IF v_provider_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Provider not found');
  END IF;

  -- Get shift details
  SELECT assigned_provider_id, facility_id
  INTO v_assigned_provider_id, v_facility_id
  FROM shifts WHERE id = p_shift_id;

  IF v_assigned_provider_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Shift not found or not assigned');
  END IF;

  IF v_assigned_provider_id != v_provider_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Can only cancel own assigned shifts');
  END IF;

  -- Update shift back to open
  UPDATE shifts SET
    assigned_provider_id = NULL,
    status = 'open',
    updated_at = now()
  WHERE id = p_shift_id;

  -- Create notification for facility users
  INSERT INTO notifications (recipient_id, type, shift_id, message)
  SELECT
    id,
    'cancelled',
    p_shift_id,
    'A provider has cancelled their shift assignment'
  FROM profiles
  WHERE user_type = 'facility';

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION show_interest(p_shift_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_provider_id UUID;
  v_provider_name TEXT;
  v_provider_role provider_role;
  v_shift_status shift_status;
  v_facility_id UUID;
  v_shift_date DATE;
  v_shift_start TIME;
  v_shift_end TIME;
  v_required_role provider_role;
  v_provider_role_check provider_role;
BEGIN
  -- Get provider id for current user
  SELECT id, role INTO v_provider_id, v_provider_role_check
  FROM providers WHERE auth_user_id = auth.uid();

  IF v_provider_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Provider not found');
  END IF;

  -- Get shift details
  SELECT status, facility_id, date, start_time, end_time, required_role
  INTO v_shift_status, v_facility_id, v_shift_date, v_shift_start, v_shift_end, v_required_role
  FROM shifts WHERE id = p_shift_id;

  IF v_shift_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Shift not found');
  END IF;

  IF v_shift_status != 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Shift is not open for interest');
  END IF;

  IF v_required_role != v_provider_role_check THEN
    RETURN jsonb_build_object('success', false, 'error', 'Role mismatch');
  END IF;

  -- Get provider name
  SELECT first_name || ' ' || last_name, role
  INTO v_provider_name, v_provider_role
  FROM providers WHERE id = v_provider_id;

  -- Insert interest record
  INSERT INTO shift_interests (shift_id, provider_id)
  VALUES (p_shift_id, v_provider_id)
  ON CONFLICT (shift_id, provider_id) DO NOTHING;

  -- Create notification for facility users
  INSERT INTO notifications (recipient_id, type, shift_id, message)
  SELECT
    id,
    'interest',
    p_shift_id,
    v_provider_name || ' (' || v_provider_role || ') has shown interest in a shift on ' || v_shift_date || ' from ' || v_shift_start || ' to ' || v_shift_end
  FROM profiles
  WHERE user_type = 'facility';

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE notifications SET read = true
  WHERE id = p_notification_id AND recipient_id = auth.uid();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Notification not found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Trigger to prevent invalid direct assignment updates
CREATE OR REPLACE FUNCTION validate_shift_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.assigned_provider_id IS NOT NULL AND OLD.status = 'assigned' AND NEW.status = 'assigned' THEN
    -- Allow re-assigning
    RETURN NEW;
  END IF;

  IF NEW.assigned_provider_id IS NOT NULL AND OLD.status IN ('open', 'pending') THEN
    -- Validate assignment
    IF NOT EXISTS (
      SELECT 1 FROM provider_facility_relationships
      WHERE provider_id = NEW.assigned_provider_id AND facility_id = NEW.facility_id
    ) THEN
      RAISE EXCEPTION 'Provider is not related to this facility';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM providers
      WHERE id = NEW.assigned_provider_id AND role = NEW.required_role
    ) THEN
      RAISE EXCEPTION 'Provider role does not match shift requirements';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_shift_assignment_trigger ON shifts;
CREATE TRIGGER validate_shift_assignment_trigger
  BEFORE UPDATE ON shifts
  FOR EACH ROW
  EXECUTE FUNCTION validate_shift_assignment();

-- Auth hook to create/update profiles and link provider auth_user_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_type public.user_type;
BEGIN
  v_user_type := COALESCE((NEW.raw_user_meta_data->>'user_type')::public.user_type, 'facility');

  INSERT INTO public.profiles (id, email, user_type)
  VALUES (
    NEW.id,
    NEW.email,
    v_user_type
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = now();

  -- If this is a provider, link their auth_user_id
  IF v_user_type = 'provider' THEN
    UPDATE public.providers
    SET auth_user_id = NEW.id,
        updated_at = now()
    WHERE LOWER(email) = LOWER(NEW.email)
      AND auth_user_id IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function grants
-- Authenticated-only RPCs: not callable by anon
REVOKE EXECUTE ON FUNCTION public.assign_shift(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.accept_assignment(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.decline_assignment(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cancel_shift(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.show_interest(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_notification_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_shift(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accept_assignment(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decline_assignment(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_shift(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.show_interest(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(uuid) TO authenticated, service_role;

-- Provider pay view (RLS enforced via security_invoker)
CREATE OR REPLACE VIEW public.provider_own_pay
WITH (security_invoker = true)
AS
SELECT
  s.id AS shift_id,
  s.date,
  s.start_time,
  s.end_time,
  s.hourly_pay_rate,
  s.status,
  s.assigned_provider_id,
  s.facility_id,
  f.name AS facility_name
FROM public.shifts s
LEFT JOIN public.facilities f ON f.id = s.facility_id
WHERE s.assigned_provider_id IS NOT NULL
  AND s.status IN ('pending', 'assigned');

COMMENT ON VIEW public.provider_own_pay IS
  'Provider-scoped pay view; RLS on underlying shifts table enforced via security_invoker.';

GRANT SELECT ON public.provider_own_pay TO authenticated;

-- Trigger functions: not callable via the API at all
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_shift_assignment() FROM PUBLIC, anon, authenticated;

-- check_provider_exists stays anon-callable (pre-login provider check on /auth)
GRANT EXECUTE ON FUNCTION public.check_provider_exists(text) TO anon, authenticated, service_role;

-- Realtime
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE shifts;
ALTER PUBLICATION supabase_realtime ADD TABLE shift_interests;
ALTER PUBLICATION supabase_realtime ADD TABLE shift_history;
ALTER PUBLICATION supabase_realtime ADD TABLE provider_availability;
ALTER PUBLICATION supabase_realtime ADD TABLE provider_credentials;
ALTER PUBLICATION supabase_realtime ADD TABLE timesheets;

-- Enable realtime on tables
ALTER TABLE notifications REPLICA IDENTITY FULL;
ALTER TABLE shifts REPLICA IDENTITY FULL;
ALTER TABLE shift_interests REPLICA IDENTITY FULL;
ALTER TABLE shift_history REPLICA IDENTITY FULL;
ALTER TABLE provider_availability REPLICA IDENTITY FULL;
ALTER TABLE provider_credentials REPLICA IDENTITY FULL;
ALTER TABLE timesheets REPLICA IDENTITY FULL;
