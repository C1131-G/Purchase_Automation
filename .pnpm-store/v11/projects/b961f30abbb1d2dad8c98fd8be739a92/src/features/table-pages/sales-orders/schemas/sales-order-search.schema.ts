import { z } from "zod";

export const salesOrderColumnFilterValueSchema = z.union([
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

export const salesOrderColumnFilterSchema = z.object({
  id: z.string(),
  value: salesOrderColumnFilterValueSchema,
});

export const salesOrderSearchSchema = z.object({
  CardCode: z.string().optional(),
  CardName: z.string().optional(),
  DocDateEnd: z.string().optional(),
  DocDateStart: z.string().optional(),
  DocNum: z.string().optional(),
  DocStatus: z.string().optional(),
  DocTotal: z.coerce.number().optional(),
  DocTotalOperator: z.enum(["eq", "lt", "gt"]).optional(),
  columnFilters: z.array(salesOrderColumnFilterSchema).optional(),
  columnOrder: z.array(z.string()).optional(),
  columnVisibility: z.record(z.string(), z.boolean()).optional(),
  filter: z.string().optional(),
  limit: z.coerce.number().int().min(1).catch(10),
  page: z.coerce.number().int().min(1).catch(1),
  sorting: z.array(z.object({ desc: z.boolean(), id: z.string() })).optional(),
});

export type SalesOrderSearch = z.infer<typeof salesOrderSearchSchema>;
export type SalesOrderColumnFilter = z.infer<typeof salesOrderColumnFilterSchema>;
