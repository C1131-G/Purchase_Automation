import { z } from "zod";

const ApCreditMemoLineSchema = z.object({
  lineNum: z.coerce.number().int(),
  itemCode: z.string().min(1),
  itemDescription: z.string().optional(),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0).optional(),
  baseEntry: z.coerce.number().int().optional(),
  baseLine: z.coerce.number().int().optional(),
  baseType: z.coerce.number().int().optional(),
});

export const CreateApCreditMemoSchema = z.object({
  docNum: z.coerce.number().int(),
  docDate: z.string().min(1),
  docDueDate: z.string().optional(),
  cardCode: z.string().min(1),
  cardName: z.string().optional(),
  docCurrency: z.string().optional(),
  address: z.string().optional(),
  address2: z.string().optional(),
  lines: z.array(ApCreditMemoLineSchema).min(1),
  isDraft: z.boolean().optional(),
  draftDocEntry: z.coerce.number().int().optional(),
});

export const UpdateApCreditMemoSchema = CreateApCreditMemoSchema.partial();

export const ApCreditMemoListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
  cardCode: z.string().optional(),
  docStatus: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
});
