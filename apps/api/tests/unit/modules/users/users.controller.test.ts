import { describe, it, expect, beforeEach, vi } from "vitest";
import { UsersController } from "../../../../src/modules/users/users.controller.js";
import type { UsersService } from "../../../../src/modules/users/users.service.js";
import { createMockRequest, createMockResponse } from "../../../helpers/mock-express.js";
import { createMockUser } from "../../../helpers/mock-user.js";

describe("UsersController", () => {
  let usersService: UsersService;
  let controller: UsersController;
  let res: ReturnType<typeof createMockResponse>;

  const mockUser = createMockUser();

  beforeEach(() => {
    usersService = {
      list: vi.fn(),
      inviteUser: vi.fn(),
      updateUser: vi.fn(),
      deactivate: vi.fn(),
      resendInvitation: vi.fn(),
      cancelInvitation: vi.fn(),
      exportAll: vi.fn(),
    } as unknown as UsersService;

    controller = new UsersController(usersService);
    res = createMockResponse();
  });

  describe("list", () => {
    it("returns paginated users", async () => {
      vi.mocked(usersService.list).mockResolvedValue({ data: [mockUser], total: 1 });
      const req = createMockRequest({ query: { page: "1", limit: "10", role: "Analyst" } });

      await controller.list(req, res);

      expect(usersService.list).toHaveBeenCalledWith(
        expect.objectContaining({ role: "Analyst", offset: 0, limit: 10 })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [mockUser],
          meta: { page: 1, limit: 10, total: 1 },
        })
      );
    });
  });

  describe("invite", () => {
    it("invites a user and returns 201", async () => {
      const body = { email: "new@test.com", role: "Analyst" };
      vi.mocked(usersService.inviteUser).mockResolvedValue(mockUser);
      const req = createMockRequest({ body });

      await controller.invite(req, res);

      expect(usersService.inviteUser).toHaveBeenCalledWith(body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: mockUser, message: "Invitation sent" })
      );
    });
  });

  describe("update", () => {
    it("updates a user", async () => {
      const body = { firstName: "Updated" };
      vi.mocked(usersService.updateUser).mockResolvedValue({ ...mockUser, ...body });
      const req = createMockRequest({ params: { id: mockUser.userId }, body });

      await controller.update(req, res);

      expect(usersService.updateUser).toHaveBeenCalledWith(mockUser.userId, body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "User updated" })
      );
    });
  });

  describe("deactivate", () => {
    it("deactivates a user", async () => {
      const req = createMockRequest({ params: { id: mockUser.userId } });

      await controller.deactivate(req, res);

      expect(usersService.deactivate).toHaveBeenCalledWith(mockUser.userId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "User deactivated" })
      );
    });
  });

  describe("resendInvitation", () => {
    it("resends invitation for a user", async () => {
      const req = createMockRequest({ params: { id: mockUser.userId } });

      await controller.resendInvitation(req, res);

      expect(usersService.resendInvitation).toHaveBeenCalledWith(mockUser.userId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Invitation resent" })
      );
    });
  });

  describe("cancelInvitation", () => {
    it("cancels invitation for a user", async () => {
      const req = createMockRequest({ params: { id: mockUser.userId } });

      await controller.cancelInvitation(req, res);

      expect(usersService.cancelInvitation).toHaveBeenCalledWith(mockUser.userId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Invitation cancelled" })
      );
    });
  });

  describe("exportCsv", () => {
    it("exports users as CSV", async () => {
      vi.mocked(usersService.exportAll).mockResolvedValue([
        {
          userId: mockUser.userId,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          role: mockUser.role,
          status: mockUser.status,
        },
      ] as never);
      const req = createMockRequest();

      await controller.exportCsv(req, res);

      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/csv");
      expect(res.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        "attachment; filename=users.csv"
      );
      expect(res.send).toHaveBeenCalledWith(
        expect.stringContaining("userId,email,firstName,lastName,role,status")
      );
      expect(res.send).toHaveBeenCalledWith(expect.stringContaining(mockUser.email));
    });

    it("handles null values in CSV export", async () => {
      vi.mocked(usersService.exportAll).mockResolvedValue([
        {
          userId: mockUser.userId,
          email: mockUser.email,
          firstName: null,
          lastName: null,
          role: mockUser.role,
          status: mockUser.status,
        },
      ] as never);
      const req = createMockRequest();

      await controller.exportCsv(req, res);

      expect(res.send).toHaveBeenCalledWith(
        expect.stringContaining(`${mockUser.userId},${mockUser.email},,,${mockUser.role},${mockUser.status}`)
      );
    });
  });
});
