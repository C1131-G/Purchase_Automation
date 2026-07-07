import { z } from "zod";

const GoodsIssueLineSchema = z.object({
  lineNum: z.coerce.number().int(),
  itemCode: z.string().min(1),
  dscription: z.string().optional(),
  quantity: z.coerce.number().positive(),
  price: z.coerce.number().min(0).optional(),
  warehouseCode: z.string().optional(),
  acctCode: z.string().optional(),
  ocrCode: z.string().optional(),
  costingCode: z.string().optional(),
  uomCode: z.string().optional(),
  unitMsr: z.string().optional(),
  documentLinesBinAllocations: z.array(z.any()).optional(),
});

export const CreateGoodsIssueSchema = z.object({
  docNum: z.coerce.number().int(),
  docDate: z.string().min(1),
  taxDate: z.string().optional(),
  comments: z.string().optional(),
  jrnlMemo: z.string().optional(),
  docCurrency: z.string().optional(),
  ref2: z.string().optional(),
  series: z.coerce.number().int().optional(),
  priceList: z.coerce.number().int().optional(),
  attachments: z.array(z.any()).optional(),
  lines: z.array(GoodsIssueLineSchema).min(1),
});

export const UpdateGoodsIssueSchema = z.object({
  comments: z.string().optional(),
  jrnlMemo: z.string().optional(),
  ref2: z.string().optional(),
  attachments: z.array(z.any()).optional(),
});

export const GoodsIssueListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
  docStatus: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
});
