import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildQueryString, apiListWithMeta, downloadApiCsv } from "@/services/api/listing";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  createObjectURL: vi.fn(),
  revokeObjectURL: vi.fn(),
  click: vi.fn(),
}));

function jsonResponse(body: unknown, status = 200, statusText = "OK") {
  return {
    status,
    statusText,
    ok: status >= 200 && status < 300,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe("buildQueryString", () => {
  it("returns empty string when no params", () => {
    expect(buildQueryString({})).toBe("");
  });

  it("skips undefined, null, and empty-string values", () => {
    expect(buildQueryString({ a: "x", b: undefined, c: null, d: "" })).toBe("?a=x");
  });

  it("stringifies numbers and booleans", () => {
    expect(buildQueryString({ page: 1, active: true })).toBe("?page=1&active=true");
  });
});

describe("apiListWithMeta", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mocks.fetch);
    mocks.fetch.mockReset();
  });

  it("returns data and meta on success", async () => {
    mocks.fetch.mockResolvedValue(
      jsonResponse({
        success: true,
        data: [{ id: 1 }],
        meta: { page: 1, limit: 20, total: 1 },
      }),
    );
    const result = await apiListWithMeta<{ id: number }>("/items", { page: 1 });
    expect(result.data).toEqual([{ id: 1 }]);
    expect(result.meta).toEqual({ page: 1, limit: 20, total: 1 });
    expect(mocks.fetch).toHaveBeenCalledWith(
      "/api/v1/items?page=1",
      expect.objectContaining({ credentials: "include", cache: "no-store" }),
    );
  });

  it("uses defaults for page/limit/total when meta is missing", async () => {
    mocks.fetch.mockResolvedValue(jsonResponse({ success: true, data: [{ id: 1 }, { id: 2 }] }));
    const result = await apiListWithMeta<{ id: number }>("/items");
    expect(result.meta).toEqual({ page: 1, limit: 20, total: 2 });
    expect(result.data).toHaveLength(2);
  });

  it("falls back to empty data when both data and meta are missing", async () => {
    mocks.fetch.mockResolvedValue(jsonResponse({ success: true }));
    const result = await apiListWithMeta<unknown>("/items");
    expect(result.data).toEqual([]);
    expect(result.meta).toEqual({ page: 1, limit: 20, total: 0 });
  });

  it("throws ApiError when envelope success is false", async () => {
    mocks.fetch.mockResolvedValue(
      jsonResponse({ success: false, error: { code: "BAD", message: "nope" } }, 400),
    );
    await expect(apiListWithMeta("/items")).rejects.toMatchObject({
      code: "BAD",
      message: "nope",
      status: 400,
    });
  });

  it("throws ApiError with INVALID_JSON when response body is not parseable", async () => {
    mocks.fetch.mockResolvedValue({
      status: 200,
      statusText: "OK",
      ok: true,
      json: vi.fn().mockRejectedValue(new SyntaxError("bad")),
    });
    await expect(apiListWithMeta("/items")).rejects.toMatchObject({ code: "INVALID_JSON" });
  });

  it("uses statusText when error envelope has no message", async () => {
    mocks.fetch.mockResolvedValue(
      jsonResponse({ success: false, error: { code: "E" } }, 500, "Server Error"),
    );
    await expect(apiListWithMeta("/items")).rejects.toMatchObject({
      code: "E",
      message: "Server Error",
    });
  });

  it("throws with default code when error envelope is missing", async () => {
    mocks.fetch.mockResolvedValue(
      jsonResponse({ success: false }, 418, "Teapot"),
    );
    await expect(apiListWithMeta("/items")).rejects.toMatchObject({
      code: "ERROR",
      message: "Teapot",
      status: 418,
    });
  });
});

describe("downloadApiCsv", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mocks.fetch);
    mocks.fetch.mockReset();
    mocks.createObjectURL.mockReset();
    mocks.revokeObjectURL.mockReset();
    mocks.click.mockReset();
    mocks.createObjectURL.mockReturnValue("blob:test");
    vi.stubGlobal("URL", {
      ...globalThis.URL,
      createObjectURL: mocks.createObjectURL,
      revokeObjectURL: mocks.revokeObjectURL,
    });
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "a") {
        return { href: "", download: "", click: mocks.click } as unknown as HTMLAnchorElement;
      }
      return document.createElement(tag);
    });
  });

  it("downloads the CSV blob on success", async () => {
    const blob = new Blob(["a,b\n1,2"]);
    mocks.fetch.mockResolvedValue({
      status: 200,
      statusText: "OK",
      ok: true,
      blob: vi.fn().mockResolvedValue(blob),
    } as unknown as Response);

    await downloadApiCsv("/export", { from: "2026-01-01" }, "out.csv");

    expect(mocks.fetch).toHaveBeenCalledWith(
      "/api/v1/export?from=2026-01-01",
      expect.objectContaining({ credentials: "include" }),
    );
    expect(mocks.createObjectURL).toHaveBeenCalledWith(blob);
    expect(mocks.click).toHaveBeenCalled();
    expect(mocks.revokeObjectURL).toHaveBeenCalledWith("blob:test");
  });

  it("uses the API error message when present and response is not ok", async () => {
    mocks.fetch.mockResolvedValue({
      status: 500,
      statusText: "Server Error",
      ok: false,
      json: vi.fn().mockResolvedValue({ error: { message: "DB unavailable" } }),
    } as unknown as Response);

    await expect(downloadApiCsv("/export", {}, "out.csv")).rejects.toMatchObject({
      code: "EXPORT_FAILED",
      message: "DB unavailable",
      status: 500,
    });
  });

  it("falls back to statusText when error response has no JSON body", async () => {
    mocks.fetch.mockResolvedValue({
      status: 502,
      statusText: "Bad Gateway",
      ok: false,
      json: vi.fn().mockRejectedValue(new SyntaxError("no body")),
    } as unknown as Response);

    await expect(downloadApiCsv("/export", {}, "out.csv")).rejects.toMatchObject({
      code: "EXPORT_FAILED",
      message: "Bad Gateway",
    });
  });

  it("uses error message from JSON body when present", async () => {
    mocks.fetch.mockResolvedValue({
      status: 500,
      statusText: "Internal Server Error",
      ok: false,
      json: vi.fn().mockResolvedValue({ error: { message: "DB unavailable" } }),
    } as unknown as Response);

    await expect(downloadApiCsv("/export", {}, "out.csv")).rejects.toMatchObject({
      code: "EXPORT_FAILED",
      message: "DB unavailable",
    });
  });
});
