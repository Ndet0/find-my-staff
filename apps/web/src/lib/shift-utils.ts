export const SHIFT_ROLES = ["CNA", "LPN", "RN", "NP"] as const;
export const SHIFT_SPECIALTIES = [
  "ICU",
  "Emergency",
  "Med-Surg",
  "Telemetry",
  "Long-Term Care",
  "Family Medicine",
] as const;

export function shiftHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  let hours = eh + em / 60 - (sh + sm / 60);
  if (hours < 0) hours += 24;
  return hours;
}
