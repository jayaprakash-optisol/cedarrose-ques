import { ZodError } from "zod";

export function formatZodError(err: ZodError): string {
  const issues = err.issues.map((issue) => {
    const path = issue.path.length ? issue.path.join(".") : "request";
    return `${path}: ${issue.message}`;
  });
  return issues.join("; ");
}
