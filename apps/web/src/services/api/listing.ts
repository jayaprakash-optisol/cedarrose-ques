import { env } from "@/config/env";
import type { PaginatedResult, PaginationMeta } from "@/types/pagination";
import { ApiError, type ApiEnvelope } from "./errors";

type QueryValue = string | number | boolean | undefined | null;

export function buildQueryString(params: Record<string, QueryValue>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    qs.set(key, String(value));
  }
  const query = qs.toString();
  return query ? `?${query}` : "";
}

async function parseEnvelope<T>(res: Response): Promise<ApiEnvelope<T>> {
  try {
    return (await res.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiError("INVALID_JSON", "Invalid response from server", res.status);
  }
}

export async function apiListWithMeta<T>(
  path: string,
  params: Record<string, QueryValue> = {},
): Promise<PaginatedResult<T>> {
  const res = await fetch(`${env.apiBaseUrl}${path}${buildQueryString(params)}`, {
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
  });

  const body = await parseEnvelope<T[]>(res);
  if (!body.success) {
    throw new ApiError(body.error?.code ?? "ERROR", body.error?.message ?? res.statusText, res.status);
  }

  const meta: PaginationMeta = body.meta ?? {
    page: Number(params.page ?? 1),
    limit: Number(params.limit ?? 20),
    total: body.data?.length ?? 0,
  };

  return { data: (body.data ?? []) as T[], meta };
}

export async function downloadApiCsv(
  path: string,
  params: Record<string, QueryValue>,
  filename: string,
): Promise<void> {
  const res = await fetch(`${env.apiBaseUrl}${path}${buildQueryString(params)}`, {
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as ApiEnvelope<unknown>;
      message = body.error?.message ?? message;
    } catch {
      // response may not be JSON
    }
    throw new ApiError("EXPORT_FAILED", message, res.status);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
