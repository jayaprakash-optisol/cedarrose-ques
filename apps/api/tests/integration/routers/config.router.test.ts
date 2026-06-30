import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { configRouter } from "../../../src/modules/config/config.router.js";
import { ConfigController } from "../../../src/modules/config/config.controller.js";
import type { ConfigService } from "../../../src/modules/config/config.service.js";
import { errorHandler } from "../../../src/middleware/error-handler.js";
import { createMockUser } from "../../helpers/mock-user.js";

function createMockConfigService(): ConfigService {
  return {
    get: vi.fn(),
    replace: vi.fn(),
  } as unknown as ConfigService;
}

function createConfigApp(service: ConfigService) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = createMockUser({ role: "Admin" });
    next();
  });
  app.use("/api/v1/config", configRouter(new ConfigController(service)));
  app.use(errorHandler);
  return app;
}

describe("config router", () => {
  let service: ReturnType<typeof createMockConfigService>;

  beforeEach(() => {
    service = createMockConfigService();
  });

  it("GET / returns config", async () => {
    vi.mocked(service.get).mockResolvedValue({ linkValidityDays: 7 } as never);
    const app = createConfigApp(service);

    const res = await request(app).get("/api/v1/config");

    expect(res.status).toBe(200);
    expect(res.body.data.linkValidityDays).toBe(7);
  });

  it("PUT / replaces config with valid body", async () => {
    vi.mocked(service.replace).mockResolvedValue({ linkValidityDays: 14 } as never);
    const app = createConfigApp(service);

    const res = await request(app).put("/api/v1/config").send({ linkValidityDays: 14 });

    expect(res.status).toBe(200);
    expect(service.replace).toHaveBeenCalled();
  });

  it("PUT / returns 422 for invalid body", async () => {
    const app = createConfigApp(service);
    const res = await request(app).put("/api/v1/config").send({ linkValidityDays: 0 });
    expect(res.status).toBe(422);
  });
});
