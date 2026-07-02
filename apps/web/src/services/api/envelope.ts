import { ApiError, type ApiEnvelope } from "./errors";

export async function parseApiEnvelope<T>(res: Response): Promise<ApiEnvelope<T>> {
  try {
    return (await res.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiError("INVALID_JSON", "Invalid response from server", res.status);
  }
}
