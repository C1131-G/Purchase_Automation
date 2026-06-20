import { z } from "zod";

export const transferColumnFilterValueSchema = z.union([
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

export const transferColumnFilterSchema = z.object({
  id: z.string(),
  value: transferColumnFilterValueSchema,
});

export const transferSearchSchema = z.object({
  DocNum: z.string().optional(),
  Comments: z.string().optional(),
  Filler: z.string().optional(),
  ToWhsCode: z.string().optional(),
  DocDateStart: z.string().optional(),
  DocDateEnd: z.string().optional(),
  DocTotalOperator: z.enum(["eq", "lt", "gt"]).optional(),
  DocTotal: z.coerce.number().optional(),
  columnFilters: z.array(transferColumnFilterSchema).optional(),
  columnOrder: z.array(z.string()).optional(),
  columnVisibility: z.record(z.string(), z.boolean()).optional(),
  filter: z.string().optional(),
  limit: z.coerce.number().int().min(1).catch(10),
  page: z.coerce.number().int().min(1).catch(1),
  sorting: z.array(z.object({ desc: z.boolean(), id: z.string() })).optional(),
});

export type TransferSearch = z.infer<typeof transferSearchSchema>;
export type TransferColumnFilter = z.infer<typeof transferColumnFilterSchema>;
