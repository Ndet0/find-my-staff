-- Provider pay isolation: scoped view for own assigned shift earnings
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
