export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
  meta?: { page: number; limit: number; total: number };
  error?: { code: string; message: string; requestId?: string };
}
