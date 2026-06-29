import type { users } from "../../db/schema/users.js";

declare global {
  namespace Express {
    interface Request {
      id?: string;
      user?: typeof users.$inferSelect;
    }
  }
}

export {};
