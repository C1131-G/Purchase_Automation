import { z } from "zod";

const ApInvoiceLineSchema = z.object({
  baseEntry: z.coerce.number().int().optional(),
  baseLine: z.coerce.number().int().optional(),
  baseQuantity: z.coerce.number().optional(),
  baseType: z.coerce.number().int().optional(),
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

export const CreateApInvoiceSchema = z.object({
  address: z.string().optional(),
  address2: z.string().optional(),
  cardCode: z.string().min(1),
  cardName: z.string().optional(),
  docCurrency: z.string().optional(),
  docDate: z.string().min(1),
  docDueDate: z.string().optional(),
  docNum: z.coerce.number().int(),
  draftDocEntry: z.coerce.number().int().optional(),
  isDraft: z.boolean().optional(),
  lines: z.array(ApInvoiceLineSchema).min(1),
});

export const UpdateApInvoiceSchema = CreateApInvoiceSchema.partial();

export const ApInvoiceListQuerySchema = z.object({
  cardCode: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  docStatus: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
  search: z.string().optional(),
});

export const ApInvoiceGetParamSchema = z.object({
  docNum: z.coerce.number().int(),
});
