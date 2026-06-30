import { describe, it, expect, vi } from "vitest";
import { success, failure, sendSuccess, sendError } from "../../../src/shared/utils/response.js";

describe("response utils", () => {
  it("builds success envelope", () => {
    expect(success({ id: 1 }, "ok", { page: 1, limit: 10, total: 1 })).toEqual({
      success: true,
      data: { id: 1 },
      message: "ok",
      meta: { page: 1, limit: 10, total: 1 },
    });
  });

  it("builds failure envelope", () => {
    expect(failure("ERR", "boom", "req-1")).toEqual({
      success: false,
      error: { code: "ERR", message: "boom", requestId: "req-1" },
    });
  });

  it("sends json via express response", () => {
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    sendSuccess(res as never, { ok: true }, 201, "created");
    expect(res.status).toHaveBeenCalledWith(201);
    sendError(res as never, 400, "bad");
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
