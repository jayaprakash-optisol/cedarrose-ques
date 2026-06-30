import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { env } from "../config/env.js";
import { getDb } from "../config/database.js";
import { users } from "../db/schema/users.js";
import type { JwtPayload } from "../shared/types/common.js";

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Authentication token missing" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, env.jwtAccessPublicKey, {
      algorithms: [env.jwtAlgorithm],
    }) as JwtPayload;

    if (!decoded.sub || !decoded.email || !decoded.role) {
      return res.status(401).json({ success: false, message: "Invalid token format" });
    }

    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.userId, decoded.sub)).limit(1);

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid authentication token" });
    }

    if (user.role !== decoded.role) {
      return res.status(401).json({ success: false, message: "User role mismatch" });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ success: false, message: "Invalid authentication token" });
    }
    next(err);
  }
}
