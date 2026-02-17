import { z } from 'zod'

export const apCreditNoteColumnFilterValueSchema = z.union([
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

export const apCreditNoteColumnFilterSchema = z.object({
  id: z.string(),
  value: apCreditNoteColumnFilterValueSchema,
})

export const apCreditNoteSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).catch(10),
  sorting: z.array(z.object({ id: z.string(), desc: z.boolean() })).optional(),
  columnVisibility: z.record(z.string(), z.boolean()).optional(),
  columnOrder: z.array(z.string()).optional(),
  columnFilters: z.array(apCreditNoteColumnFilterSchema).optional(),
  filter: z.string().optional(),
  DocNum: z.string().optional(),
  CardCode: z.string().optional(),
  CardName: z.string().optional(),
  DocStatus: z.string().optional(),
  DocDateStart: z.string().optional(),
  DocDateEnd: z.string().optional(),
})

export type APCreditNoteSearch = z.infer<typeof apCreditNoteSearchSchema>
export type APCreditNoteColumnFilter = z.infer<typeof apCreditNoteColumnFilterSchema>
export type APCreditNoteColumnFilterValue = z.infer<typeof apCreditNoteColumnFilterValueSchema>
