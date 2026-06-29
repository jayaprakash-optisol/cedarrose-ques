import { env } from "../../config/env.js";
import { AppError } from "../errors/AppError.js";

const ALLOWED_HOSTS = new Set(env.allowedExternalHosts);

export async function safeExternalFetch(url: string, opts: RequestInit = {}): Promise<Response> {
  const { hostname } = new URL(url);
  if (!ALLOWED_HOSTS.has(hostname)) {
    throw new AppError(400, "SSRF_BLOCKED", `Host ${hostname} is not allowed`);
  }
  return fetch(url, opts);
}
