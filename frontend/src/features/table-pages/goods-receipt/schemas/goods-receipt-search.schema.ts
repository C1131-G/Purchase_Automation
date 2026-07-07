import { z } from "zod";

export const goodsReceiptColumnFilterValueSchema = z.union([
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
  z
    .object({
      operator: z.enum(["eq", "lt", "gt"]),
      value: z.coerce.number(),
    })
    .strict(),
]);

export const goodsReceiptColumnFilterSchema = z.object({
  id: z.string(),
  value: goodsReceiptColumnFilterValueSchema,
});

export const goodsReceiptSearchSchema = z.object({
  DocNum: z.string().optional(),
  Comments: z.string().optional(),
  DocStatus: z.string().optional(),
  DocDateStart: z.string().optional(),
  DocDateEnd: z.string().optional(),
  TaxDateStart: z.string().optional(),
  TaxDateEnd: z.string().optional(),
  DocTotalOperator: z.enum(["eq", "lt", "gt"]).optional(),
  DocTotal: z.coerce.number().optional(),
  columnFilters: z.array(goodsReceiptColumnFilterSchema).optional(),
  columnOrder: z.array(z.string()).optional(),
  columnVisibility: z.record(z.string(), z.boolean()).optional(),
  filter: z.string().optional(),
  limit: z.coerce.number().int().min(1).catch(10),
  page: z.coerce.number().int().min(1).catch(1),
  sorting: z.array(z.object({ desc: z.boolean(), id: z.string() })).optional(),
});

export type GoodsReceiptSearch = z.infer<typeof goodsReceiptSearchSchema>;
export type GoodsReceiptColumnFilter = z.infer<typeof goodsReceiptColumnFilterSchema>;
