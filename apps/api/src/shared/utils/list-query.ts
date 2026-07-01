export function parseOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

/** Parse an ISO/date query param; when endOfDay is true, include the full calendar day. */
export function parseDateQuery(value: unknown, endOfDay = false): Date | undefined {
  const raw = parseOptionalString(value);
  if (!raw) return undefined;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return undefined;
  if (endOfDay) {
    date.setUTCHours(23, 59, 59, 999);
  }
  return date;
}
