import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import type { ZodTypeAny } from "zod";

import { AppError } from "@/core/errors/app-error";

export const validate =
  (schema: ZodTypeAny, source: "body" | "query" | "params" = "body") =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req[source]);
      req[source] = validatedData;
      next();
    } catch (err: unknown) {
      if (err instanceof ZodError) {
        const details = err.issues.map((zodErr) => ({
          field: zodErr.path.join("."),
          message: zodErr.message,
        }));
        return next(new AppError("Validation failed", 400, "VALIDATION_ERROR", details));
      }
      const caughtError = err instanceof Error ? err : new Error(String(err));
      next(caughtError);
    }
  };

export const validateBody = (schema: ZodTypeAny) => validate(schema, "body");
export const validateQuery = (schema: ZodTypeAny) => validate(schema, "query");
export const validateParams = (schema: ZodTypeAny) => validate(schema, "params");
