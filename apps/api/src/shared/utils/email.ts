export function normalizeEmail(email: string): string {
  if (!email) return "";
  return email.trim().toLowerCase();
}

export function detectEmailTypo(email: string): boolean {
  return /\.con$|\.cm$|@gmial\./i.test(email);
}
