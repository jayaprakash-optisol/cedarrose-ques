import type { PaginationMeta } from "../types/common.js";

export function parsePagination(query: Record<string, unknown>): { page: number; limit: number; offset: number } {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export function paginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return { page, limit, total };
}

export function sanitizeCsvCell(value: string): string {
  const str = String(value ?? "");
  if (/^[=+\-@]/.test(str)) return `'${str}`;
  return str;
}
