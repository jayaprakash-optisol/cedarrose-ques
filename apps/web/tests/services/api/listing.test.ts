import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/services/api/errors";
import {
  apiListWithMeta,
  buildQueryString,
  downloadApiCsv,
} from "@/services/api/listing";

describe("api/listing", () => {
  describe("buildQueryString", () => {
    it("returns empty string for no params", () => {
      expect(buildQueryString({})).toBe("");
    });

    it("returns empty string for params with only nullish values", () => {
      expect(buildQueryString({ a: undefined, b: null, c: "" })).toBe("");
    });

    it("encodes basic values", () => {
      expect(buildQueryString({ page: 1, limit: 20 })).toBe("?page=1&limit=20");
    });

    it("encodes boolean values as strings", () => {
      expect(buildQueryString({ grouped: false })).toBe("?grouped=false");
      expect(buildQueryString({ grouped: true })).toBe("?grouped=true");
    });
  });

  describe("apiListWithMeta", () => {
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      fetchMock = vi.fn();
      globalThis.fetch = fetchMock as unknown as typeof fetch;
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("returns data and meta on a successful 200 response", async () => {
      fetchMock.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: true,
            data: [{ id: 1 }, { id: 2 }],
            meta: { page: 1, limit: 20, total: 2 },
          }),
      });
      const out = await apiListWithMeta<{ id: number }>("/items");
      expect(out.data).toEqual([{ id: 1 }, { id: 2 }]);
      expect(out.meta).toEqual({ page: 1, limit: 20, total: 2 });
    });

    it("uses defaults when meta is missing", async () => {
      fetchMock.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: true,
            data: [{ id: 1 }],
          }),
      });
      const out = await apiListWithMeta<{ id: number }>("/items");
      expect(out.meta).toEqual({ page: 1, limit: 20, total: 1 });
    });

    it("returns an empty data array when data is missing", async () => {
      fetchMock.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: true,
          }),
      });
      const out = await apiListWithMeta<{ id: number }>("/items");
      expect(out.data).toEqual([]);
    });

    it("throws ApiError on a non-success envelope", async () => {
      fetchMock.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: false,
            error: { code: "BAD", message: "no good" },
          }),
      });
      try {
        await apiListWithMeta("/items");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).code).toBe("BAD");
        expect((err as ApiError).message).toBe("no good");
      }
    });

    it("uses 'ERROR' code and statusText as message when the error envelope is empty", async () => {
      fetchMock.mockResolvedValueOnce({
        statusText: "Bad Request",
        json: () => Promise.resolve({ success: false }),
      });
      try {
        await apiListWithMeta("/items");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).code).toBe("ERROR");
        expect((err as ApiError).message).toBe("Bad Request");
      }
    });

    it("throws ApiError with INVALID_JSON when response is not valid JSON", async () => {
      fetchMock.mockResolvedValueOnce({
        json: () => Promise.reject(new Error("parse error")),
      });
      try {
        await apiListWithMeta("/items");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).code).toBe("INVALID_JSON");
      }
    });

    it("appends query parameters to the path", async () => {
      fetchMock.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: [] }),
      });
      await apiListWithMeta("/items", { page: 2, limit: 5, search: "abc" });
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/items?page=2&limit=5&search=abc"),
        expect.any(Object),
      );
    });
  });

  describe("downloadApiCsv", () => {
    let fetchMock: ReturnType<typeof vi.fn>;
    let createObjectURL: ReturnType<typeof vi.fn>;
    let revokeObjectURL: ReturnType<typeof vi.fn>;
    let clickMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      fetchMock = vi.fn();
      globalThis.fetch = fetchMock as unknown as typeof fetch;
      createObjectURL = vi.fn(() => "blob:fake-url");
      revokeObjectURL = vi.fn();
      clickMock = vi.fn();
      URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL;
      URL.revokeObjectURL = revokeObjectURL as unknown as typeof URL.revokeObjectURL;
      const originalCreate = document.createElement.bind(document);
      vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
        const el = originalCreate(tag);
        if (tag === "a") (el as HTMLAnchorElement).click = clickMock as () => void;
        return el;
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("creates a download link and clicks it on success", async () => {
      const blob = new Blob(["a,b"], { type: "text/csv" });
      fetchMock.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(blob),
      });
      await downloadApiCsv("/items/export", { page: 1 }, "items.csv");
      expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
      expect(clickMock).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:fake-url");
    });

    it("throws EXPORT_FAILED when the response is not ok and has JSON body", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        statusText: "Internal Server Error",
        json: () => Promise.resolve({ error: { message: "Boom" } }),
      });
      try {
        await downloadApiCsv("/items/export", {}, "items.csv");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).code).toBe("EXPORT_FAILED");
        expect((err as ApiError).message).toBe("Boom");
      }
    });

    it("falls back to statusText when the error body is not JSON", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        statusText: "Service Unavailable",
        json: () => Promise.reject(new Error("not json")),
      });
      try {
        await downloadApiCsv("/items/export", {}, "items.csv");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).code).toBe("EXPORT_FAILED");
        expect((err as ApiError).message).toBe("Service Unavailable");
      }
    });

    it("keeps the original message when the error envelope has no message field", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        statusText: "Internal Server Error",
        json: () => Promise.resolve({ error: {} }),
      });
      try {
        await downloadApiCsv("/items/export", {}, "items.csv");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).code).toBe("EXPORT_FAILED");
        expect((err as ApiError).message).toBe("Internal Server Error");
      }
    });
  });
});
