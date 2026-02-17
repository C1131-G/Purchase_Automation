import { z } from 'zod'

export const outgoingPaymentColumnFilterValueSchema = z.union([
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

export const outgoingPaymentColumnFilterSchema = z.object({
  id: z.string(),
  value: outgoingPaymentColumnFilterValueSchema,
})

export const outgoingPaymentSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).catch(10),
  sorting: z.array(z.object({ id: z.string(), desc: z.boolean() })).optional(),
  columnVisibility: z.record(z.string(), z.boolean()).optional(),
  columnOrder: z.array(z.string()).optional(),
  columnFilters: z.array(outgoingPaymentColumnFilterSchema).optional(),
  filter: z.string().optional(),
  DocNum: z.string().optional(),
  CardCode: z.string().optional(),
  CardName: z.string().optional(),
  DocDateStart: z.string().optional(),
  DocDateEnd: z.string().optional(),
  DocTotalOperator: z.enum(['eq', 'lt', 'gt']).optional(),
  DocTotal: z.coerce.number().optional(),
})

export type OutgoingPaymentSearch = z.infer<typeof outgoingPaymentSearchSchema>
export type OutgoingPaymentColumnFilter = z.infer<typeof outgoingPaymentColumnFilterSchema>
