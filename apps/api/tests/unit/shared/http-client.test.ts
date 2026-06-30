import { describe, it, expect, vi, beforeEach } from "vitest";
import { safeExternalFetch } from "../../../src/shared/utils/http-client.js";
import { AppError } from "../../../src/shared/errors/AppError.js";

vi.mock("../../../src/config/env.js", () => ({
  env: { allowedExternalHosts: ["data-exchange.cedarrose.com"] },
}));

describe("safeExternalFetch", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("blocks disallowed hosts", async () => {
    await expect(safeExternalFetch("https://evil.example.com/api")).rejects.toBeInstanceOf(AppError);
  });

  it("allows configured hosts", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("ok"));
    await safeExternalFetch("https://data-exchange.cedarrose.com/push");
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
