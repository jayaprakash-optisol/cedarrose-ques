import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";
import { ZodError } from "zod";
import { failure } from "../shared/utils/response.js";
import { formatZodError } from "../shared/utils/validation-error.js";

type RequestPart = "body" | "query" | "params";

export function validate(schema: ZodSchema, part: RequestPart = "body") {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[part]);
      req[part] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res
          .status(422)
          .json(failure("VALIDATION_ERROR", formatZodError(err), String(req.id ?? "")));
      }
      next(err);
    }
  };
}
