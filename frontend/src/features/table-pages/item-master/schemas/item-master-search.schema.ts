import { z } from "zod";

export const itemMasterColumnFilterValueSchema = z.union([
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

export const itemMasterColumnFilterSchema = z.object({
  id: z.string(),
  value: itemMasterColumnFilterValueSchema,
});

export const itemMasterSearchSchema = z.object({
  ItemCode: z.string().optional(),
  ItemName: z.string().optional(),
  frozenFor: z.string().optional(),
  validFor: z.string().optional(),
  ItmsGrpCod: z.coerce.number().optional(),
  InvntryUom: z.string().optional(),
  CodeBars: z.string().optional(),
  columnFilters: z.array(itemMasterColumnFilterSchema).optional(),
  columnOrder: z.array(z.string()).optional(),
  columnVisibility: z.record(z.string(), z.boolean()).optional(),
  filter: z.string().optional(),
  limit: z.coerce.number().int().min(1).catch(10),
  page: z.coerce.number().int().min(1).catch(1),
  sorting: z.array(z.object({ desc: z.boolean(), id: z.string() })).optional(),
});

export type ItemMasterSearch = z.infer<typeof itemMasterSearchSchema>;
export type ItemMasterColumnFilter = z.infer<typeof itemMasterColumnFilterSchema>;
