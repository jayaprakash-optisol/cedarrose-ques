import type { Request, Response } from "express";
import type { NotificationsService } from "./notifications.service.js";
import { parsePagination, paginationMeta } from "../../shared/utils/pagination.js";
import { sendSuccess } from "../../shared/utils/response.js";
import { routeParam } from "../../shared/utils/route-param.js";

export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  list = async (req: Request, res: Response) => {
    const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
    const { data, total } = await this.notificationsService.list(req.user!.userId, offset, limit);
    sendSuccess(res, data, 200, undefined, paginationMeta(page, limit, total));
  };

  markRead = async (req: Request, res: Response) => {
    await this.notificationsService.markRead(routeParam(req.params.id), req.user!.userId);
    sendSuccess(res, null, 200, "Notification marked as read");
  };

  markAllRead = async (req: Request, res: Response) => {
    await this.notificationsService.markAllRead(req.user!.userId);
    sendSuccess(res, null, 200, "All notifications marked as read");
  };

  delete = async (req: Request, res: Response) => {
    await this.notificationsService.delete(routeParam(req.params.id), req.user!.userId);
    sendSuccess(res, null, 200, "Notification deleted");
  };
}
