// Common Input Validation: Reusable structures for pagination, searching, and filtering used across multiple modules.

import { z } from "zod";

// PaginationInputSchema: Standardizes how the frontend requests sets of data.
// Note: coerce is used to handle string parameters from the Express query string.
export const PaginationInputSchema = z.object({
  page: z.coerce
    .number()
    .int()
    .positive()
    .default(1)
    .openapi({ example: 1, description: "Page number" }),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(100)
    .default(20)
    .openapi({ example: 20, description: "Items per page" }),
});

// SearchInputSchema: Simple keyword filtering.
export const SearchInputSchema = z.object({
  search: z
    .string()
    .optional()
    .openapi({ example: "search term", description: "Search term for filtering results" }),
});

// DateRangeInputSchema: Enforces YYYY-MM-DD format for database date queries.
export const DateRangeInputSchema = z.object({
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional()
    .openapi({ example: "2023-01-01", description: "Start date filter (YYYY-MM-DD)" }),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional()
    .openapi({ example: "2023-12-31", description: "End date filter (YYYY-MM-DD)" }),
});

// DashboardRangeInputSchema: Controls the aggregation bucket size for analytical endpoints.
export const DashboardRangeInputSchema = z.object({
  range: z.enum(["weekly", "monthly", "yearly"]).optional().default("yearly"),
});

export type PaginationInput = z.infer<typeof PaginationInputSchema>;
export type SearchInput = z.infer<typeof SearchInputSchema>;
export type DateRangeInput = z.infer<typeof DateRangeInputSchema>;
export type DashboardRangeInput = z.infer<typeof DashboardRangeInputSchema>;
