import { z } from "zod";

const ApCreditMemoLineSchema = z.object({
  baseEntry: z.coerce.number().int().optional(),
  baseLine: z.coerce.number().int().optional(),
  baseQuantity: z.coerce.number().optional(),
  baseType: z.coerce.number().int().optional(),
  itemCode: z.string().min(1),
  itemDescription: z.string().optional(),
  lineNum: z.coerce.number().int(),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0).optional(),
});

export const CreateApCreditMemoSchema = z.object({
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
  lines: z.array(ApCreditMemoLineSchema).min(1),
});

export const UpdateApCreditMemoSchema = CreateApCreditMemoSchema.partial();

export const ApCreditMemoListQuerySchema = z.object({
  cardCode: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  docStatus: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
  search: z.string().optional(),
});
