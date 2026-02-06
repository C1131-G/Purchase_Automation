// Common Output Validation: Standard response structures used for documentation and consistent API behavior.

import { z } from "zod";

// SuccessResponseSchema: The base structure for all successful non-paginated responses.
export const SuccessResponseSchema = z.object({
  success: z.literal(true).openapi({ example: true }),
  data: z.any().openapi({ description: "Response payload (structure varies by endpoint)" }),
  message: z.string().optional().openapi({ example: "Operation successful" }),
});

// ErrorResponseSchema: Formalizes the structure for API errors, supporting field-level details (e.g., from Zod validation).
export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  errorCode: z.string().optional(),
  details: z
    .array(
      z.object({
        field: z.string(),
        message: z.string(),
      }),
    )
    .optional(),
});

// PaginatedResponseSchema: Standard wrapper for all list-based endpoints, providing metadata for the frontend.
export const PaginatedResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(z.any()),
  total: z.number(), // Total number of records across all pages.
  page: z.number(), // Current page number.
  limit: z.number(), // Records per page.
  totalPages: z.number(), // total / limit (rounded up).
});
