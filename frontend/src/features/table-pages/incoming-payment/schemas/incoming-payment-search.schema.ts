import { z } from 'zod'

export const incomingPaymentColumnFilterValueSchema = z.union([
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

export const incomingPaymentColumnFilterSchema = z.object({
  id: z.string(),
  value: incomingPaymentColumnFilterValueSchema,
})

export const incomingPaymentSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).catch(10),
  sorting: z
    .array(z.object({ id: z.string(), desc: z.boolean() }))
    .catch([{ id: 'DocDate', desc: true }]),
  columnVisibility: z.record(z.string(), z.boolean()).optional(),
  columnOrder: z.array(z.string()).optional(),
  columnFilters: z.array(incomingPaymentColumnFilterSchema).optional(),
  filter: z.string().optional(),
  DocNum: z.string().optional(),
  CardCode: z.string().optional(),
  CardName: z.string().optional(),
  DocDateStart: z.string().optional(),
  DocDateEnd: z.string().optional(),
  DocTotalOperator: z.enum(['eq', 'lt', 'gt']).optional(),
  DocTotal: z.coerce.number().optional(),
  CounterRef: z.string().optional(),
})

export type IncomingPaymentSearch = z.infer<typeof incomingPaymentSearchSchema>
export type IncomingPaymentColumnFilter = z.infer<typeof incomingPaymentColumnFilterSchema>
