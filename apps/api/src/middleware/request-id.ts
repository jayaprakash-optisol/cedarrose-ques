import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";

export function requestId() {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.id = (req.headers["x-request-id"] as string) || randomUUID();
    next();
  };
}
