-- Keep only Alice (a8@shiftnex.com) and Bob (admin@shiftnex.com).
-- Cleans dependent data, deletes other providers, and re-seeds demo interests/notifications.

-- 1. Fix shifts assigned to providers being removed
UPDATE public.shifts
SET status = 'open', assigned_provider_id = NULL
WHERE assigned_provider_id IN (
  SELECT id FROM public.providers
  WHERE email NOT IN ('a8@shiftnex.com', 'admin@shiftnex.com')
);

UPDATE public.shifts
SET status = 'open'
WHERE assigned_provider_id IS NULL
  AND status IN ('assigned', 'pending');

-- 2. Clear stale volatile demo data
DELETE FROM public.notifications;
DELETE FROM public.shift_interests;
DELETE FROM public.shift_history;

-- 3. Delete all providers except Alice and Bob
DELETE FROM public.providers
WHERE email NOT IN ('a8@shiftnex.com', 'admin@shiftnex.com');

-- 4. Remove orphaned provider auth accounts for deleted emails
DELETE FROM auth.users
WHERE LOWER(email) IN (
  'cna1@shiftnex.com',
  'lpn1@shiftnex.com',
  'np1@shiftnex.com',
  'qwefmark8@gmail.com',
  'treinlojo@gmail.com',
  'josephmkaranja07@gmail.com',
  'deborahnaka2015@gmail.com',
  'livelikendet0@gmail.com',
  'festus.kisoi@students.jkuat.ac.ke'
)
AND id IN (SELECT id FROM public.profiles WHERE user_type = 'provider');

-- 5. Re-seed shift interests for Alice and Bob
WITH alice AS (SELECT id FROM public.providers WHERE email = 'a8@shiftnex.com'),
     bob AS (SELECT id FROM public.providers WHERE email = 'admin@shiftnex.com'),
     icu_shift AS (
       SELECT s.id FROM public.shifts s
       WHERE s.status = 'open' AND s.required_role = 'RN' AND s.required_specialty = 'ICU'
       ORDER BY s.date LIMIT 1
     ),
     er_shift AS (
       SELECT s.id FROM public.shifts s
       WHERE s.status = 'open' AND s.required_role = 'RN' AND s.required_specialty = 'Emergency'
       ORDER BY s.date LIMIT 1
     )
INSERT INTO public.shift_interests (shift_id, provider_id, note)
SELECT shift_id, provider_id, note FROM (
  SELECT (SELECT id FROM icu_shift) AS shift_id, (SELECT id FROM alice) AS provider_id, 'Available all week, ICU is my home unit.' AS note
  UNION ALL SELECT (SELECT id FROM er_shift), (SELECT id FROM bob), 'Happy to take this ER shift.'
) AS interests
WHERE shift_id IS NOT NULL AND provider_id IS NOT NULL;

-- 6. Re-seed notifications for remaining providers
INSERT INTO public.notifications (recipient_id, type, shift_id, message)
SELECT p.id, 'interest', si.shift_id,
       pr.first_name || ' ' || pr.last_name || ' (' || pr.role || ') showed interest in a shift'
FROM public.profiles p
CROSS JOIN public.shift_interests si
JOIN public.providers pr ON pr.id = si.provider_id
WHERE p.user_type = 'facility';

INSERT INTO public.notifications (recipient_id, type, shift_id, message)
SELECT p.id, 'accepted', s.id,
       pr.first_name || ' ' || pr.last_name || ' accepted their shift assignment'
FROM public.profiles p
CROSS JOIN LATERAL (
  SELECT id, assigned_provider_id FROM public.shifts WHERE status = 'assigned' ORDER BY date LIMIT 1
) s
JOIN public.providers pr ON pr.id = s.assigned_provider_id
WHERE p.user_type = 'facility';

INSERT INTO public.notifications (recipient_id, type, shift_id, message)
SELECT pr.auth_user_id, 'assigned', s.id,
       'You have been assigned to a new shift. Please accept or decline.'
FROM public.shifts s
JOIN public.providers pr ON pr.id = s.assigned_provider_id
WHERE s.status = 'pending' AND pr.auth_user_id IS NOT NULL;
