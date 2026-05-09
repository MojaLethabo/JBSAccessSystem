export function eventEndDate(start: Date, durationDays: number): Date {
  const d = new Date(start);
  d.setDate(d.getDate() + Math.max(0, durationDays - 1));
  d.setHours(23, 59, 59, 999);
  return d;
}

export function normalizeRegistrationToken(raw: unknown): string {
  const s =
    typeof raw === "string"
      ? raw
      : Array.isArray(raw) && typeof raw[0] === "string"
        ? raw[0]
        : "";
  const trimmed = s.trim();
  if (!trimmed) return "";
  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}
