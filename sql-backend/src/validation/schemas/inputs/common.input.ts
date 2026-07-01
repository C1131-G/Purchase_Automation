import { z } from "zod";

export const PaginationInputSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  page: z.coerce.number().min(1).default(1),
});

export const SearchInputSchema = z.object({
  search: z.string().trim().optional(),
});

export const DateRangeInputSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});
