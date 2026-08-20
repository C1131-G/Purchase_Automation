// Common Input Validation: Reusable structures for pagination, searching, and filtering used across multiple modules.

import { z } from "zod";
import { PAGINATION_LIMIT, VALIDATION_PATTERN } from "@vendor-portal/validation-contracts";

// PaginationInputSchema: Standardizes how the frontend requests sets of data.
// Query values are lexical strings first so signs and exponent notation are not coerced.
export const PaginationInputSchema = z.object({
  limit: z
    .string()
    .regex(VALIDATION_PATTERN.digits, "Limit must contain digits only")
    .transform(Number)
    .pipe(z.number().int().positive().max(PAGINATION_LIMIT))
    .default("20"),
  page: z
    .string()
    .regex(VALIDATION_PATTERN.digits, "Page must contain digits only")
    .transform(Number)
    .pipe(z.number().int().positive())
    .default("1"),
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

/** Route ids stay strings for existing Service Layer calls but reject signed/exponent notation. */
export const SapDocumentIdParamsSchema = z
  .object({ id: z.string().regex(/^[1-9]\d*$/, "Document id must be a positive integer") })
  .strict();

export const SapDocumentNumberParamsSchema = z
  .object({ docNum: z.string().regex(/^[1-9]\d*$/, "Document number must be a positive integer") })
  .passthrough();

export type PaginationInput = z.infer<typeof PaginationInputSchema>;
export type SearchInput = z.infer<typeof SearchInputSchema>;
export type DateRangeInput = z.infer<typeof DateRangeInputSchema>;
export type DashboardRangeInput = z.infer<typeof DashboardRangeInputSchema>;
