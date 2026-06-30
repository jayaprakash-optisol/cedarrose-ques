import { vi } from "vitest";
import type { DrizzleDB } from "../../src/config/database.js";

function createQueryBuilder(getResult: () => unknown) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of [
    "from",
    "where",
    "leftJoin",
    "innerJoin",
    "orderBy",
    "limit",
    "offset",
    "values",
    "set",
    "onConflictDoUpdate",
    "groupBy",
  ]) {
    builder[method] = vi.fn(() => builder);
  }
  builder.returning = vi.fn(() => Promise.resolve(getResult()));
  (builder as unknown as { then: typeof Promise.prototype.then }).then = (resolve, reject) =>
    Promise.resolve(getResult()).then(resolve, reject);
  return builder;
}

export function createMockDrizzle() {
  const queue: unknown[] = [];
  const dequeue = () => (queue.length ? queue.shift() : []);

  const db = {
    select: vi.fn(() => {
      const result = dequeue();
      return createQueryBuilder(() => result);
    }),
    insert: vi.fn(() => createQueryBuilder(() => {
      const r = dequeue();
      return Array.isArray(r) ? r : [r];
    })),
    update: vi.fn(() => createQueryBuilder(() => {
      const r = dequeue();
      return Array.isArray(r) ? r : [r];
    })),
    delete: vi.fn(() => createQueryBuilder(dequeue)),
    transaction: vi.fn(async (fn: (tx: DrizzleDB) => Promise<unknown>) => fn(db as unknown as DrizzleDB)),
    queueResults: (...results: unknown[]) => {
      queue.push(...results);
    },
  };

  return db as typeof db & { queueResults: (...results: unknown[]) => void };
}
