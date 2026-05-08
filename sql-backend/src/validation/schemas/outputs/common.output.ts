// Common Output Validation: Standard response structures for API responses.

import { z } from "zod";

export const SuccessResponseSchema = z.object({
  data: z.any().openapi({ description: "Response payload" }),
  message: z.string().optional().openapi({ example: "Operation successful" }),
  success: z.literal(true).openapi({ example: true }),
});

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

export const PaginatedResponseSchema = z.object({
  data: z.array(z.any()),
  limit: z.number(),
  page: z.number(),
  success: z.literal(true),
  total: z.number(),
  totalPages: z.number(),
});
