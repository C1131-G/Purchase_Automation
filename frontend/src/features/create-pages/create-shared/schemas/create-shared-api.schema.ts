import { z } from "zod";

export const vendorAddressSchema = z.object({
  addressName: z.string(),
  addressType: z.enum(["B", "S"]),
  addressText: z.string(),
});

export const lookupItemSchema = z.object({
  billToAddress: z.string().optional(),
  code: z.string(),
  foreignName: z.string().optional(),
  name: z.string(),
  rate: z.number().optional(),
  /** OVTG.Category — I = purchase input, O = sales output. */
  category: z.string().optional(),
  salesEmployeeCode: z.union([z.string(), z.number()]).optional(),
  salesEmployeeName: z.string().optional(),
  shipToAddress: z.string().optional(),
  addresses: z.array(vendorAddressSchema).optional(),
  currency: z.string().optional(),
  uomEntry: z.number().optional(),
  /** SAP business place (OWHS.BPLid / OBPL.BPLId) when present. */
  branchId: z.number().nullable().optional(),
  /** NNM1.NextNumber when this lookup is a document series. */
  nextNumber: z.number().nullable().optional(),
  enableBinLocations: z.boolean().optional(),
});

export const productLookupItemSchema = lookupItemSchema.extend({
  currency: z.string(),
  defaultWarehouse: z.string().optional(),
  lastPurchaseCurrency: z.string().optional(),
  lastPurchasePrice: z.number().optional(),
  price: z.number(),
  purchaseUomCode: z.string().optional(),
  purchaseUomEntry: z.number().optional(),
  stock: z.number(),
  taxRate: z.number(),
  uomCode: z.string().optional(),
  uomEntry: z.number().optional(),
  uomName: z.string().optional(),
  uomList: z
    .array(
      z.object({
        code: z.string(),
        name: z.string(),
        uomEntry: z.number().optional(),
      }),
    )
    .optional(),
  vatGroup: z.string(),
  manSerNum: z.string().optional(), // 'Y' if serial-managed
  manBtchNum: z.string().optional(), // 'Y' if batch-managed
});

export const productWarehouseStockItemSchema = z.object({
  code: z.string(),
  name: z.string(),
  stock: z.number(),
});
