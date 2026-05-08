// Common Input Validation: Reusable structures for pagination, searching, and filtering used across multiple modules.

import { z } from "zod";

// PaginationInputSchema: Standardizes how the frontend requests sets of data.
// Note: coerce is used to handle string parameters from the Express query string.
export const PaginationInputSchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(100)
    .default(20)
    .openapi({ description: "Items per page", example: 20 }),
  page: z.coerce
    .number()
    .int()
    .positive()
    .default(1)
    .openapi({ description: "Page number", example: 1 }),
});

// SearchInputSchema: Simple keyword filtering.
export const SearchInputSchema = z.object({
  search: z.string().optional().openapi({
    description: "Search term for filtering results",
    example: "search term",
  }),
});

// DateRangeInputSchema: Enforces YYYY-MM-DD format for database date queries.
export const DateRangeInputSchema = z.object({
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional()
    .openapi({
      description: "End date filter (YYYY-MM-DD)",
      example: "2023-12-31",
    }),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional()
    .openapi({
      description: "Start date filter (YYYY-MM-DD)",
      example: "2023-01-01",
    }),
});

// DashboardRangeInputSchema: Controls the aggregation bucket size for analytical endpoints.
export const DashboardRangeInputSchema = z.object({
  range: z.enum(["weekly", "monthly", "yearly"]).optional().default("yearly"),
});

export type PaginationInput = z.infer<typeof PaginationInputSchema>;
export type SearchInput = z.infer<typeof SearchInputSchema>;
export type DateRangeInput = z.infer<typeof DateRangeInputSchema>;
export type DashboardRangeInput = z.infer<typeof DashboardRangeInputSchema>;
