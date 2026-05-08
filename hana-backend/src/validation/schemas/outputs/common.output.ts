// Common Output Validation: Standard response structures used for documentation and consistent API behavior.

import { z } from "zod";

// SuccessResponseSchema: The base structure for all successful non-paginated responses.
export const SuccessResponseSchema = z.object({
  data: z.any().openapi({
    description: "Response payload (structure varies by endpoint)",
  }),
  message: z.string().optional().openapi({ example: "Operation successful" }),
  success: z.literal(true).openapi({ example: true }),
});

// ErrorResponseSchema: Formalizes the structure for API errors, supporting field-level details (e.g., from Zod validation).
export const ErrorResponseSchema = z.object({
  details: z
    .array(
      z.object({
        field: z.string(),
        message: z.string(),
      }),
    )
    .optional(),
  errorCode: z.string().optional(),
  message: z.string(),
  success: z.literal(false),
});

// PaginatedResponseSchema: Standard wrapper for all list-based endpoints, providing metadata for the frontend.
export const PaginatedResponseSchema = z.object({
  data: z.array(z.any()),
  limit: z.number(), // Records per page.
  page: z.number(), // Current page number.
  success: z.literal(true),
  total: z.number(), // Total number of records across all pages.
  totalPages: z.number(), // total / limit (rounded up).
});
