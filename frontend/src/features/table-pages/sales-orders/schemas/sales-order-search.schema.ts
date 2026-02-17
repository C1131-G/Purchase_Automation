import { z } from 'zod'

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
      operator: z.enum(['eq', 'lt', 'gt']),
      value: z.coerce.number(),
    })
    .strict(),
])

export const salesOrderColumnFilterSchema = z.object({
  id: z.string(),
  value: salesOrderColumnFilterValueSchema,
})

export const salesOrderSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).catch(10).default(10).optional(),
  sorting: z.array(z.object({ id: z.string(), desc: z.boolean() })).optional(),
  columnVisibility: z.record(z.string(), z.boolean()).optional(),
  columnOrder: z.array(z.string()).optional(),
  columnFilters: z.array(salesOrderColumnFilterSchema).optional(),
  filter: z.string().optional(),
  DocNum: z.string().optional(),
  CardCode: z.string().optional(),
  CardName: z.string().optional(),
  DocStatus: z.string().optional(),
  DocDateStart: z.string().optional(),
  DocDateEnd: z.string().optional(),
  DocTotalOperator: z.enum(['eq', 'lt', 'gt']).optional(),
  DocTotal: z.coerce.number().optional(),
})

export type SalesOrderSearch = z.infer<typeof salesOrderSearchSchema>
export type SalesOrderColumnFilter = z.infer<typeof salesOrderColumnFilterSchema>
