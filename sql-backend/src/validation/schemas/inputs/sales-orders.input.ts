import { z } from "zod";

const SalesOrderLineSchema = z.object({
  lineNum: z.coerce.number().int(),
  itemCode: z.string().min(1),
  itemDescription: z.string().optional(),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0).optional(),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  vatGroup: z.string().optional(),
  warehouseCode: z.string().optional(),
  uomCode: z.string().optional(),
});

export const CreateSalesOrderSchema = z.object({
  docNum: z.coerce.number().int(),
  docDate: z.string().min(1),
  docDueDate: z.string().optional(),
  cardCode: z.string().min(1),
  cardName: z.string().optional(),
  docCurrency: z.string().optional(),
  address: z.string().optional(),
  address2: z.string().optional(),
  comments: z.string().optional(),
  numAtCard: z.string().optional(),
  salesPersonCode: z.coerce.number().int().optional(),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  lines: z.array(SalesOrderLineSchema).min(1),
  isDraft: z.boolean().optional(),
  draftDocEntry: z.coerce.number().int().optional(),
});

export const UpdateSalesOrderSchema = CreateSalesOrderSchema.partial();

export const SalesOrderListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
  cardCode: z.string().optional(),
  docStatus: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
});
