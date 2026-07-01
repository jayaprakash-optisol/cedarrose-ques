import type { Request, Response } from "express";
import type { UsersService } from "./users.service.js";
import { parsePagination, paginationMeta, sanitizeCsvCell } from "../../shared/utils/pagination.js";
import { sendSuccess } from "../../shared/utils/response.js";
import { routeParam } from "../../shared/utils/route-param.js";

export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  list = async (req: Request, res: Response) => {
    const { page, limit, offset } = parsePagination(req.query);
    const { data, total } = await this.usersService.list({
      role: req.query.role as string | undefined,
      offset,
      limit,
    });
    sendSuccess(res, data, 200, undefined, paginationMeta(page, limit, total));
  };

  invite = async (req: Request, res: Response) => {
    const user = await this.usersService.inviteUser(req.body);
    sendSuccess(res, user, 201, "Invitation sent");
  };

  update = async (req: Request, res: Response) => {
    const user = await this.usersService.updateUser(routeParam(req.params.id), req.body);
    sendSuccess(res, user, 200, "User updated");
  };

  deactivate = async (req: Request, res: Response) => {
    await this.usersService.deactivate(routeParam(req.params.id));
    sendSuccess(res, null, 200, "User deactivated");
  };

  resendInvitation = async (req: Request, res: Response) => {
    await this.usersService.resendInvitation(routeParam(req.params.id));
    sendSuccess(res, null, 200, "Invitation resent");
  };

  cancelInvitation = async (req: Request, res: Response) => {
    await this.usersService.cancelInvitation(routeParam(req.params.id));
    sendSuccess(res, null, 200, "Invitation cancelled");
  };

  exportCsv = async (_req: Request, res: Response) => {
    const rows = await this.usersService.exportAll();
    const header = "userId,email,firstName,lastName,role,status\n";
    const body = rows
      .map((r) =>
        [r.userId, r.email, r.firstName, r.lastName, r.role, r.status]
          .map((c) => sanitizeCsvCell(String(c ?? "")))
          .join(",")
      )
      .join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=users.csv");
    res.send(header + body);
  };
}
