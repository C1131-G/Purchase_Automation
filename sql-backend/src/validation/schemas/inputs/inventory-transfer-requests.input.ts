import { z } from "zod";

const InventoryTransferRequestLineSchema = z.object({
  lineNum: z.coerce.number().int(),
  itemCode: z.string().min(1),
  dscription: z.string().optional(),
  quantity: z.coerce.number().positive(),
  fromWarehouseCode: z.string().optional(),
  warehouseCode: z.string().optional(),
  openQty: z.coerce.number().min(0).optional(),
});

export const CreateInventoryTransferRequestSchema = z.object({
  docNum: z.coerce.number().int(),
  docDate: z.string().min(1),
  comments: z.string().optional(),
  toWarehouseCode: z.string().optional(),
  docCurrency: z.string().optional(),
  lines: z.array(InventoryTransferRequestLineSchema).min(1),
});

export const InventoryTransferRequestListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
  docStatus: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
});
