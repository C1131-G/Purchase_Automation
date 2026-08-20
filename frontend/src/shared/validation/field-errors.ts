import type { ZodIssue } from "zod";

export type FieldErrors = Record<string, string>;

/** Converts Zod paths into stable field keys used by feature form state. */
export const zodIssuesToFieldErrors = (issues: readonly ZodIssue[]): FieldErrors => {
  const result: FieldErrors = {};
  for (const issue of issues) {
    const field = issue.path.join(".") || "form";
    if (!result[field]) {
      result[field] = issue.message;
    }
  }
  return result;
};
