import { z } from "zod";

export const icRetryColumnFilterValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z
    .object({
      from: z.string().optional(),
      to: z.string().optional(),
    })
    .strict(),
]);

export const icRetryColumnFilterSchema = z.object({
  id: z.string(),
  value: icRetryColumnFilterValueSchema,
});

/**
 * URL search for `/intercompany/retries`.
 * Status filter is client-side over the session-company list from GET /ic/retries.
 */
export const icRetrySearchSchema = z.object({
  actionCode: z.string().optional(),
  columnFilters: z.array(icRetryColumnFilterSchema).optional(),
  columnOrder: z.array(z.string()).optional(),
  columnVisibility: z.record(z.string(), z.boolean()).optional(),
  limit: z.coerce.number().int().min(1).catch(10),
  page: z.coerce.number().int().min(1).catch(1),
  q: z.string().optional(),
  sorting: z.array(z.object({ desc: z.boolean(), id: z.string() })).optional(),
  /** Client filter; "all" shows every row returned by the list API. */
  status: z.enum(["all", "WAITING", "PROCESSING", "SUCCESS", "DEAD"]).optional().catch("all"),
});

export type IcRetrySearch = z.infer<typeof icRetrySearchSchema>;
export type IcRetryColumnFilter = z.infer<typeof icRetryColumnFilterSchema>;
