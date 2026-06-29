const MOCK_LATENCY_MS = 300;

export function delay(ms = MOCK_LATENCY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Shift ISO date fields so relative timestamps stay fresh for demos. */
export function normalizeMockDates<T extends object>(
  records: T[],
  dateFields: (keyof T)[],
): T[] {
  const now = Date.now();
  return records.map((record) => {
    const copy = { ...record };
    for (const field of dateFields) {
      const value = copy[field];
      if (typeof value === "string" && value.includes("T")) {
        const original = new Date(value).getTime();
        const age = now - original;
        if (age > 0 && age < 90 * 86_400_000) {
          (copy as Record<string, unknown>)[field as string] = new Date(now - age).toISOString();
        }
      }
    }
    return copy;
  });
}
