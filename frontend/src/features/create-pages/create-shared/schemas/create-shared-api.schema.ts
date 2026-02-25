import { z } from 'zod'

export const lookupItemSchema = z.object({
  code: z.string(),
  name: z.string(),
  rate: z.number().optional(),
  billToAddress: z.string().optional(),
  shipToAddress: z.string().optional(),
  salesEmployeeCode: z.union([z.string(), z.number()]).optional(),
  salesEmployeeName: z.string().optional(),
})

export const productLookupItemSchema = lookupItemSchema.extend({
  stock: z.number(),
  price: z.number(),
  currency: z.string(),
  taxCode: z.string(),
  taxRate: z.number(),
  uomCode: z.string().optional(),
  uomEntry: z.number().optional(),
  purchaseUomCode: z.string().optional(),
  purchaseUomEntry: z.number().optional(),
})

export const productWarehouseStockItemSchema = z.object({
  code: z.string(),
  name: z.string(),
  stock: z.number(),
})
