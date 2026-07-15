import { z } from "zod";

const InventoryTransferLineSchema = z.object({
  dscription: z.string().optional(),
  fromWarehouseCode: z.string().optional(),
  itemCode: z.string().min(1),
  lineNum: z.coerce.number().int(),
  quantity: z.coerce.number().positive(),
  warehouseCode: z.string().optional(),
});

export const CreateInventoryTransferSchema = z.object({
  comments: z.string().optional(),
  docCurrency: z.string().optional(),
  docDate: z.string().min(1),
  docNum: z.coerce.number().int(),
  lines: z.array(InventoryTransferLineSchema).min(1),
  toWarehouseCode: z.string().optional(),
});

export const InventoryTransferListQuerySchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  docStatus: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
  search: z.string().optional(),
});
