import { addHours, format } from "date-fns";

export function formatLinkValidityLabel(hours: number): string {
  if (hours % 24 === 0) {
    const days = hours / 24;
    return days === 1 ? "1 day" : `${days} days`;
  }
  return hours === 1 ? "1 hour" : `${hours} hours`;
}

export function projectedLinkExpiry(hours: number, from = new Date()): string {
  return format(addHours(from, hours), "dd MMM yyyy");
}

export function formatLinkExpiryDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return format(new Date(iso), "dd MMM yyyy");
}
