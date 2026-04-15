// Validation Middleware: Higher-order middleware to validate request data using Zod schemas.
// Integrates with AppError for consistent error handling across the application.

import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodTypeAny } from "zod";

import AppError from "@/core/errors/app-error";

// Generic validation middleware factory
export const validate = (schema: ZodTypeAny, source: "body" | "query" | "params" = "body") => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      // Parse and validate the data
      const validatedData = schema.parse(req[source]);

      // Replace with sanitized/validated data
      req[source] = validatedData;

      next();
    } catch (err: unknown) {
      // Transform Zod errors into AppError format
      if (err instanceof ZodError) {
        const details = err.errors.map((zodErr) => ({
          field: zodErr.path.join("."),
          message: zodErr.message,
        }));

        return next(new AppError("Validation failed", 400, "VALIDATION_ERROR", details));
      }

      // Pass other errors to global handler
      const error = err instanceof Error ? err : new Error(String(err));
      next(error);
    }
  };
};

// Validate request body
export const validateBody = (schema: ZodTypeAny) => validate(schema, "body");

// Validate query parameters
export const validateQuery = (schema: ZodTypeAny) => validate(schema, "query");

// Validate route parameters
export const validateParams = (schema: ZodTypeAny) => validate(schema, "params");
