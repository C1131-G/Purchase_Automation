import { z } from "zod";

export const lookupItemSchema = z.object({
  billToAddress: z.string().optional(),
  code: z.string(),
  name: z.string(),
  rate: z.number().optional(),
  salesEmployeeCode: z.union([z.string(), z.number()]).optional(),
  salesEmployeeName: z.string().optional(),
  shipToAddress: z.string().optional(),
});

export const productLookupItemSchema = lookupItemSchema.extend({
  currency: z.string(),
  defaultWarehouse: z.string().optional(),
  price: z.number(),
  purchaseUomCode: z.string().optional(),
  purchaseUomEntry: z.number().optional(),
  stock: z.number(),
  taxRate: z.number(),
  uomCode: z.string().optional(),
  uomEntry: z.number().optional(),
  vatGroup: z.string(),
});

export const productWarehouseStockItemSchema = z.object({
  code: z.string(),
  name: z.string(),
  stock: z.number(),
});
