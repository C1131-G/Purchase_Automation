import { z } from "zod";

export const rfqColumnFilterValueSchema = z.union([
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

export const rfqColumnFilterSchema = z.object({
  id: z.string(),
  value: rfqColumnFilterValueSchema,
});

/**
 * URL search for `/sales/rfqs`.
 * Mirrors purchase-quotation table chrome; filtering is client-side over GET /ic/rfqs.
 */
export const rfqSearchSchema = z.object({
  CardCode: z.string().optional(),
  DocNum: z.string().optional(),
  DocStatus: z.string().optional(),
  columnFilters: z.array(rfqColumnFilterSchema).optional(),
  columnOrder: z.array(z.string()).optional(),
  columnVisibility: z.record(z.string(), z.boolean()).optional(),
  limit: z.coerce.number().int().min(1).catch(10),
  page: z.coerce.number().int().min(1).catch(1),
  pqDraftDocEntry: z.string().optional(),
  pqDraftDocNum: z.string().optional(),
  sorting: z.array(z.object({ desc: z.boolean(), id: z.string() })).optional(),
});

export type RfqSearch = z.infer<typeof rfqSearchSchema>;
export type RfqColumnFilter = z.infer<typeof rfqColumnFilterSchema>;
