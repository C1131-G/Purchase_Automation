import { z } from 'zod'

export const apInvoiceColumnFilterValueSchema = z.union([
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
      operator: z.enum(['eq', 'lt', 'gt']),
      value: z.coerce.number(),
    })
    .strict(),
])

export const apInvoiceColumnFilterSchema = z.object({
  id: z.string(),
  value: apInvoiceColumnFilterValueSchema,
})

export const apInvoiceSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).catch(10),
  sorting: z.array(z.object({ id: z.string(), desc: z.boolean() })).optional(),
  columnVisibility: z.record(z.string(), z.boolean()).optional(),
  columnOrder: z.array(z.string()).optional(),
  columnFilters: z.array(apInvoiceColumnFilterSchema).optional(),
  filter: z.string().optional(),
  DocNum: z.string().optional(),
  CardCode: z.string().optional(),
  CardName: z.string().optional(),
  DocStatus: z.string().optional(),
  DocDateStart: z.string().optional(),
  DocDateEnd: z.string().optional(),
})

export type APInvoiceSearch = z.infer<typeof apInvoiceSearchSchema>
export type APInvoiceColumnFilter = z.infer<typeof apInvoiceColumnFilterSchema>
