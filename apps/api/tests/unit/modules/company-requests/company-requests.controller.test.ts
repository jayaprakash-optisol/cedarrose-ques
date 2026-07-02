import { describe, it, expect, beforeEach, vi } from "vitest";
import { CompanyRequestsController } from "../../../../src/modules/company-requests/company-requests.controller.js";
import type { CompanyRequestsService } from "../../../../src/modules/company-requests/company-requests.service.js";
import { createMockRequest, createMockResponse } from "../../../helpers/mock-express.js";

const REQUEST_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

const row = {
  companyRequestId: REQUEST_ID,
  orderId: "ORD-10001",
  externalRef: "UID-44529",
  companyName: "Acme Trading LLC",
  status: "Pending",
} as never;

describe("CompanyRequestsController", () => {
  let service: CompanyRequestsService;
  let controller: CompanyRequestsController;
  let res: ReturnType<typeof createMockResponse>;

  beforeEach(() => {
    service = {
      receive: vi.fn(),
      list: vi.fn(),
      getById: vi.fn(),
    } as unknown as CompanyRequestsService;
    controller = new CompanyRequestsController(service);
    res = createMockResponse();
  });

  describe("receive", () => {
    it("stores the webhook body and responds 201", async () => {
      vi.mocked(service.receive).mockResolvedValue(row);
      const body = { orderId: "ORD-10001", externalRef: "UID-44529" };
      const req = createMockRequest({ body });

      await controller.receive(req, res);

      expect(service.receive).toHaveBeenCalledWith(body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: row, message: "Company request received" }),
      );
    });
  });

  describe("list", () => {
    it("forwards the status query to the service", async () => {
      vi.mocked(service.list).mockResolvedValue([row]);
      const req = createMockRequest({ query: { status: "Pending" } });

      await controller.list(req, res);

      expect(service.list).toHaveBeenCalledWith("Pending");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: [row] }));
    });

    it("lists all when no status query is provided", async () => {
      vi.mocked(service.list).mockResolvedValue([]);
      const req = createMockRequest();

      await controller.list(req, res);

      expect(service.list).toHaveBeenCalledWith(undefined);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("getById", () => {
    it("returns the request for the given id", async () => {
      vi.mocked(service.getById).mockResolvedValue(row);
      const req = createMockRequest({ params: { id: REQUEST_ID } });

      await controller.getById(req, res);

      expect(service.getById).toHaveBeenCalledWith(REQUEST_ID);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: row }));
    });
  });
});
