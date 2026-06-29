import { formatDistanceToNow, format } from "date-fns";

export function relTime(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 0) return `in ${formatDistanceToNow(d)}`;
  if (diff < 60_000) return "just now";
  if (diff < 86_400_000) return formatDistanceToNow(d, { addSuffix: true });
  if (diff < 7 * 86_400_000) return formatDistanceToNow(d, { addSuffix: true });
  return format(d, "dd MMM yyyy 'at' HH:mm");
}

export function absTime(iso: string | undefined): string {
  if (!iso) return "—";
  return format(new Date(iso), "dd MMM yyyy, HH:mm");
}

export function isStale(iso: string, hours = 72): boolean {
  return Date.now() - new Date(iso).getTime() > hours * 3600_000;
}
