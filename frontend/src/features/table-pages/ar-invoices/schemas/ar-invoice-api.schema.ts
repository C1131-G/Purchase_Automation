import { z } from 'zod'

export const arInvoiceListItemSchema = z.object({
  id: z.number(),
  DocNum: z.number(),
  DocDate: z.string(),
  CardCode: z.string(),
  CardName: z.string(),
  DocTotal: z.union([z.number(), z.string()]),
  BalanceDue: z.union([z.number(), z.string()]),
  DocCurr: z.string(),
  NumAtCard: z.string().nullable().optional(),
  DocStatus: z.enum(['Open', 'Closed']),
  paidSum: z.union([z.number(), z.string()]).optional(),
})

export const arInvoiceListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(arInvoiceListItemSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
})

export const arInvoiceListParamsSchema = z.object({
  page: z.number().optional(),
  limit: z.number().optional(),
  DocNum: z.string().optional(),
  CardCode: z.string().optional(),
  CardName: z.string().optional(),
  DocStatus: z.enum(['Open', 'Closed']).optional(),
  DocDateStart: z.string().optional(),
  DocDateEnd: z.string().optional(),
  DocTotalOperator: z.enum(['eq', 'lt', 'gt']).optional(),
  DocTotal: z.number().optional(),
  NumAtCard: z.string().optional(),
  paidSumOperator: z.enum(['eq', 'lt', 'gt']).optional(),
  paidSum: z.number().optional(),
  sortBy: z
    .enum([
      'DocNum',
      'DocDate',
      'CardCode',
      'CardName',
      'DocTotal',
      'NumAtCard',
      'paidSum',
      'DocStatus',
    ])
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})
