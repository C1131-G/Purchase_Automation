import { z } from "zod";

export const purchaseOrderColumnFilterValueSchema = z.union([
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

export const purchaseOrderColumnFilterSchema = z.object({
  id: z.string(),
  value: purchaseOrderColumnFilterValueSchema,
});

export const purchaseOrderSearchSchema = z.object({
  // Pagination (syncs with table state)
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).catch(10),

  // Table State
  sorting: z.array(z.object({ desc: z.boolean(), id: z.string() })).optional(), // sorting
  columnVisibility: z.record(z.string(), z.boolean()).optional(), // visibility
  columnOrder: z.array(z.string()).optional(), // order
  columnFilters: z.array(purchaseOrderColumnFilterSchema).optional(), // column filters
  filter: z.string().optional(), // search filter

  // Backend Filters (aligned with PurchaseOrderQuerySchema)
  DocNum: z.string().optional(),
  CardCode: z.string().optional(),
  CardName: z.string().optional(),
  DocStatus: z.string().optional(),
  DocDateStart: z.string().optional(),
  DocDateEnd: z.string().optional(),
  DocTotalOperator: z.enum(["eq", "lt", "gt"]).optional(),
  DocTotal: z.coerce.number().optional(),
  SqDocNum: z.string().optional(),
  highlightDocNum: z.string().optional(),
  highlightUntil: z.coerce.number().optional(),
});

export type PurchaseOrderSearch = z.infer<typeof purchaseOrderSearchSchema>;
export type PurchaseOrderColumnFilter = z.infer<typeof purchaseOrderColumnFilterSchema>;
