import { z } from "zod";

const SalesOrderLineSchema = z.object({
  baseEntry: z.coerce.number().int().nullable().optional(),
  baseLine: z.coerce.number().int().nullable().optional(),
  baseQuantity: z.coerce.number().min(0).nullable().optional(),
  baseType: z.coerce.number().int().nullable().optional(),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  itemCode: z.string().min(1),
  itemDescription: z.string().optional(),
  lineNum: z.coerce.number().int(),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0).optional(),
  uomCode: z.string().optional(),
  vatGroup: z.string().optional(),
  warehouseCode: z.string().optional(),
});

export const CreateSalesOrderSchema = z.object({
  address: z.string().optional(),
  address2: z.string().optional(),
  cardCode: z.string().min(1),
  cardName: z.string().optional(),
  comments: z.string().optional(),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  docCurrency: z.string().optional(),
  docDate: z.string().min(1),
  docDueDate: z.string().optional(),
  docNum: z.coerce.number().int(),
  draftDocEntry: z.coerce.number().int().optional(),
  isDraft: z.boolean().optional(),
  lines: z.array(SalesOrderLineSchema).min(1),
  numAtCard: z.string().optional(),
  salesPersonCode: z.coerce.number().int().optional(),
});

export const UpdateSalesOrderSchema = CreateSalesOrderSchema.partial();

export const SalesOrderListQuerySchema = z.object({
  cardCode: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  docStatus: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
  search: z.string().optional(),
});
