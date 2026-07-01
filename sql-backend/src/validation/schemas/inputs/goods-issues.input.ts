import { z } from "zod";

const GoodsIssueLineSchema = z.object({
  lineNum: z.coerce.number().int(),
  itemCode: z.string().min(1),
  dscription: z.string().optional(),
  quantity: z.coerce.number().positive(),
  price: z.coerce.number().min(0).optional(),
  warehouseCode: z.string().optional(),
  acctCode: z.string().optional(),
});

export const CreateGoodsIssueSchema = z.object({
  docNum: z.coerce.number().int(),
  docDate: z.string().min(1),
  taxDate: z.string().optional(),
  comments: z.string().optional(),
  docCurrency: z.string().optional(),
  lines: z.array(GoodsIssueLineSchema).min(1),
});

export const GoodsIssueListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
  docStatus: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
});
