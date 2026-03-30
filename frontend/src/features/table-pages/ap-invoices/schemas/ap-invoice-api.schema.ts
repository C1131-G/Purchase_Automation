import { z } from 'zod'

export const apInvoiceListItemSchema = z.object({
  id: z.number(),
  DocNum: z.number(),
  DocDate: z.string(),
  CardCode: z.string(),
  CardName: z.string(),
  DocTotal: z.union([z.number(), z.string()]),
  DocCurr: z.string(),
  DocStatus: z.enum(['Open', 'Closed']),
})

export const apInvoiceListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(apInvoiceListItemSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
})

export const apInvoiceListParamsSchema = z.object({
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
  sortBy: z.enum(['DocNum', 'DocDate', 'CardCode', 'CardName', 'DocTotal', 'DocStatus']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

export const apInvoiceDetailSchema = z.object({
  id: z.number(),
  DocEntry: z.number().optional(),
  DocNum: z.number(),
  DocDate: z.string(),
  DocDueDate: z.string(),
  CardCode: z.string(),
  CardName: z.string(),
  DocTotal: z.union([z.number(), z.string()]),
  DocCurr: z.string(),
  DocStatus: z.enum(['O', 'C', 'Open', 'Closed']),
  Comments: z.string().nullable().optional(),
  NumAtCard: z.string().nullable().optional(),
  Address: z.string().nullable().optional(),
  SalesPersonCode: z.number().nullable().optional(),
  DocumentLines: z.array(
    z.object({
      LineNum: z.number(),
      ItemCode: z.string(),
      ItemDescription: z.string().optional(),
      Quantity: z.number(),
      Price: z.number(),
      UnitPrice: z.number().optional(),
      DiscountPercent: z.number().optional(),
      LineTotal: z.number().optional(),
      WarehouseCode: z.string(),
      UoMCode: z.string().nullable().optional(),
      UoMEntry: z.number().nullable().optional(),
      BaseType: z.number().nullable().optional(),
      BaseEntry: z.number().nullable().optional(),
      BaseLine: z.number().nullable().optional(),
    }),
  ),
})

export const createAPInvoiceInputSchema = z.object({
  CardCode: z.string(),
  DocDate: z.string().optional(),
  DocDueDate: z.string().optional(),
  Comments: z.string().optional(),
  Address: z.string().optional(),
  NumAtCard: z.string().optional(),
  DocumentLines: z.array(
    z.object({
      ItemCode: z.string(),
      Quantity: z.number(),
      UnitPrice: z.number().optional(),
      Price: z.number().optional(),
      UoMCode: z.union([z.string(), z.number()]).optional(),
      UoMEntry: z.number().optional(),
      WarehouseCode: z.string().optional(),
      DiscountPercent: z.number().optional(),
      BaseType: z.number().optional(),
      BaseEntry: z.number().optional(),
      BaseLine: z.number().optional(),
    }),
  ),
})

export const updateAPInvoiceInputSchema = z.object({
  DocDueDate: z.string().optional(),
  Comments: z.string().optional(),
})
