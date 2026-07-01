-- findmystaff Seed Data
-- Run this after running schema.sql

-- Volatile demo data (shifts, interests, notifications) is cleared and
-- re-created on every run so dates always cover the current week.
-- Facilities, providers, and relationships are upserted with ON CONFLICT guards.
DELETE FROM notifications;
DELETE FROM shift_interests;
DELETE FROM shift_history;
DELETE FROM shifts;

-- Insert 2 real CMS-backed facilities
-- Facility 1: Mayo Clinic Hospital Rochester (CCN 240010)
-- Facility 2: Methodist Hospital (CCN 450388) - San Antonio, TX
INSERT INTO facilities (cms_id, name, address, city, state, zip, facility_type, rating, quality_score, contact_phone, contact_email, source_metadata)
VALUES
  (
    '240010',
    'MAYO CLINIC HOSPITAL ROCHESTER',
    '1216 SECOND STREET SOUTHWEST',
    'ROCHESTER',
    'MN',
    '55902',
    'Acute Care Hospitals',
    5.0,
    95.5,
    '(507) 255-5123',
    'info@mayo.edu',
    jsonb_build_object('source', 'CMS Care Compare', 'provider_id', '240010', 'date_imported', now(), 'hospital_ownership', 'Voluntary non-profit - Church', 'emergency_services', 'Yes', 'county', 'OLMSTED')
  ),
  (
    '450388',
    'METHODIST HOSPITAL',
    '7700 FLOYD CURL DR',
    'SAN ANTONIO',
    'TX',
    '78229',
    'Acute Care Hospitals',
    4.0,
    92.0,
    '(210) 575-4000',
    'info@methodisthospital.com',
    jsonb_build_object('source', 'CMS Care Compare', 'provider_id', '450388', 'date_imported', now(), 'hospital_ownership', 'Proprietary', 'emergency_services', 'Yes', 'county', 'BEXAR')
  )
ON CONFLICT DO NOTHING;

-- Insert 2 providers
INSERT INTO providers (email, first_name, last_name, role, specialty, phone)
VALUES
  ('a8@shiftnex.com', 'Alice', 'Anderson', 'RN', 'ICU', '(555) 010-0001'),
  ('admin@shiftnex.com', 'Bob', 'Brown', 'RN', 'Emergency', '(555) 010-0002')
ON CONFLICT (email) DO NOTHING;

-- Create relationships
-- Facility 1: Mayo Clinic Rochester
-- Facility 2: Methodist Hospital
-- Alice: RN ICU at both (1099 at Mayo, W2 at Methodist)
-- Bob: RN Emergency at Methodist (W2)

WITH f1 AS (SELECT id FROM facilities WHERE cms_id = '240010'),
     f2 AS (SELECT id FROM facilities WHERE cms_id = '450388'),
     alice AS (SELECT id FROM providers WHERE email = 'a8@shiftnex.com'),
     bob AS (SELECT id FROM providers WHERE email = 'admin@shiftnex.com')
INSERT INTO provider_facility_relationships (provider_id, facility_id, employment_type)
SELECT provider_id, facility_id, employment_type FROM (
  SELECT (SELECT id FROM alice) as provider_id, (SELECT id FROM f1) as facility_id, '1099'::employment_type as employment_type
  UNION ALL SELECT (SELECT id FROM alice), (SELECT id FROM f2), 'W2'
  UNION ALL SELECT (SELECT id FROM bob), (SELECT id FROM f2), 'W2'
) AS rels
WHERE provider_id IS NOT NULL AND facility_id IS NOT NULL
ON CONFLICT (provider_id, facility_id) DO NOTHING;

-- Create 14 shifts across the current week (Monday through Sunday, relative
-- to the day the seed is run) with a mix of open / pending / assigned statuses.
-- Assignments respect provider-facility relationships and role requirements:
--   assigned = provider accepted, pending = awaiting provider acceptance.
WITH monday AS (SELECT date_trunc('week', current_date)::date AS d),
     f1 AS (SELECT id FROM facilities WHERE cms_id = '240010'),
     f2 AS (SELECT id FROM facilities WHERE cms_id = '450388'),
     alice AS (SELECT id FROM providers WHERE email = 'a8@shiftnex.com'),
     bob AS (SELECT id FROM providers WHERE email = 'admin@shiftnex.com')
INSERT INTO shifts (facility_id, date, start_time, end_time, required_role, required_specialty, hourly_pay_rate, status, assigned_provider_id)
SELECT facility_id, date, start_time, end_time, required_role, required_specialty, hourly_pay_rate, status, assigned_provider_id FROM (
  -- Monday
  SELECT (SELECT id FROM f1) as facility_id, (SELECT d FROM monday) as date, '07:00'::time as start_time, '19:00'::time as end_time, 'RN'::provider_role as required_role, 'ICU'::specialty as required_specialty, 62.00 as hourly_pay_rate, 'assigned'::shift_status as status, (SELECT id FROM alice) as assigned_provider_id
  UNION ALL SELECT (SELECT id FROM f2), (SELECT d FROM monday), '08:00', '16:00', 'LPN', 'Med-Surg', 38.00, 'open', NULL

  -- Tuesday
  UNION ALL SELECT (SELECT id FROM f1), (SELECT d FROM monday) + 1, '19:00', '07:00', 'RN', 'Emergency', 68.00, 'open', NULL
  UNION ALL SELECT (SELECT id FROM f2), (SELECT d FROM monday) + 1, '06:00', '14:00', 'CNA', 'Long-Term Care', 24.00, 'open', NULL

  -- Wednesday
  UNION ALL SELECT (SELECT id FROM f2), (SELECT d FROM monday) + 2, '08:00', '16:00', 'LPN', 'Med-Surg', 38.00, 'open', NULL
  UNION ALL SELECT (SELECT id FROM f1), (SELECT d FROM monday) + 2, '07:00', '19:00', 'RN', 'Telemetry', 64.00, 'open', NULL

  -- Thursday
  UNION ALL SELECT (SELECT id FROM f2), (SELECT d FROM monday) + 3, '07:00', '19:00', 'RN', 'Emergency', 70.00, 'pending', (SELECT id FROM bob)
  UNION ALL SELECT (SELECT id FROM f1), (SELECT d FROM monday) + 3, '06:00', '14:00', 'CNA', 'Long-Term Care', 25.00, 'open', NULL

  -- Friday
  UNION ALL SELECT (SELECT id FROM f2), (SELECT d FROM monday) + 4, '09:00', '17:00', 'NP', 'Family Medicine', 85.00, 'open', NULL
  UNION ALL SELECT (SELECT id FROM f1), (SELECT d FROM monday) + 4, '07:00', '19:00', 'RN', 'ICU', 62.00, 'open', NULL

  -- Saturday
  UNION ALL SELECT (SELECT id FROM f2), (SELECT d FROM monday) + 5, '07:00', '19:00', 'RN', 'Telemetry', 65.00, 'open', NULL
  UNION ALL SELECT (SELECT id FROM f1), (SELECT d FROM monday) + 5, '19:00', '07:00', 'RN', 'Emergency', 72.00, 'open', NULL

  -- Sunday
  UNION ALL SELECT (SELECT id FROM f1), (SELECT d FROM monday) + 6, '07:00', '19:00', 'RN', 'ICU', 66.00, 'open', NULL
  UNION ALL SELECT (SELECT id FROM f2), (SELECT d FROM monday) + 6, '08:00', '16:00', 'LPN', 'Med-Surg', 40.00, 'open', NULL
) AS shifts
WHERE facility_id IS NOT NULL;

-- Seed shift interests: providers expressing interest in open shifts
WITH alice AS (SELECT id FROM providers WHERE email = 'a8@shiftnex.com'),
     bob AS (SELECT id FROM providers WHERE email = 'admin@shiftnex.com'),
     icu_shift AS (
       SELECT s.id FROM shifts s
       WHERE s.status = 'open' AND s.required_role = 'RN' AND s.required_specialty = 'ICU'
       ORDER BY s.date LIMIT 1
     ),
     er_shift AS (
       SELECT s.id FROM shifts s
       WHERE s.status = 'open' AND s.required_role = 'RN' AND s.required_specialty = 'Emergency'
       ORDER BY s.date LIMIT 1
     )
INSERT INTO shift_interests (shift_id, provider_id, note)
SELECT shift_id, provider_id, note FROM (
  SELECT (SELECT id FROM icu_shift) as shift_id, (SELECT id FROM alice) as provider_id, 'Available all week, ICU is my home unit.' as note
  UNION ALL SELECT (SELECT id FROM er_shift), (SELECT id FROM bob), 'Happy to take this ER shift.'
) AS interests
WHERE shift_id IS NOT NULL AND provider_id IS NOT NULL;

-- Seed notifications so the realtime inbox is demoable.
-- Facility users get 'interest' and 'accepted' notifications (mirrors what the
-- show_interest / accept_assignment RPCs produce). Provider notifications are
-- only created for providers who have completed OTP login (auth_user_id set),
-- since notifications.recipient_id references profiles.
INSERT INTO notifications (recipient_id, type, shift_id, message)
SELECT p.id, 'interest', si.shift_id,
       pr.first_name || ' ' || pr.last_name || ' (' || pr.role || ') showed interest in a shift'
FROM profiles p
CROSS JOIN shift_interests si
JOIN providers pr ON pr.id = si.provider_id
WHERE p.user_type = 'facility';

INSERT INTO notifications (recipient_id, type, shift_id, message)
SELECT p.id, 'accepted', s.id,
       pr.first_name || ' ' || pr.last_name || ' accepted their shift assignment'
FROM profiles p
CROSS JOIN LATERAL (
  SELECT id, assigned_provider_id FROM shifts WHERE status = 'assigned' ORDER BY date LIMIT 1
) s
JOIN providers pr ON pr.id = s.assigned_provider_id
WHERE p.user_type = 'facility';

INSERT INTO notifications (recipient_id, type, shift_id, message)
SELECT pr.auth_user_id, 'assigned', s.id,
       'You have been assigned to a new shift. Please accept or decline.'
FROM shifts s
JOIN providers pr ON pr.id = s.assigned_provider_id
WHERE s.status = 'pending' AND pr.auth_user_id IS NOT NULL;
