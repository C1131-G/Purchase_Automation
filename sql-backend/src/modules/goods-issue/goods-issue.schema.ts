import { z } from "zod";

const GoodsIssueLineSchema = z.object({
  acctCode: z.string().optional(),
  costingCode: z.string().optional(),
  documentLinesBinAllocations: z.array(z.unknown()).optional(),
  dscription: z.string().optional(),
  inventoryAdjustmentReason: z.string().optional(),
  itemCode: z.string().min(1),
  lineNum: z.coerce.number().int(),
  ocrCode: z.string().optional(),
  price: z.coerce.number().min(0).optional(),
  quantity: z.coerce.number().positive(),
  unitMsr: z.string().optional(),
  uomCode: z.string().optional(),
  warehouseCode: z.string().optional(),
});

export const CreateGoodsIssueSchema = z.object({
  attachments: z.array(z.unknown()).optional(),
  comments: z.string().optional(),
  docCurrency: z.string().optional(),
  docDate: z.string().min(1),
  docNum: z.coerce.number().int(),
  jrnlMemo: z.string().optional(),
  lines: z.array(GoodsIssueLineSchema).min(1),
  priceList: z.coerce.number().int().optional(),
  ref2: z.string().optional(),
  series: z.coerce.number().int().optional(),
  taxDate: z.string().optional(),
});

export const UpdateGoodsIssueSchema = z.object({
  attachments: z.array(z.unknown()).optional(),
  comments: z.string().optional(),
  jrnlMemo: z.string().optional(),
  ref2: z.string().optional(),
});

export const GoodsIssueListQuerySchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  docStatus: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
  search: z.string().optional(),
});
