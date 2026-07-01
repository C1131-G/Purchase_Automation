import { z } from "zod";

export const CreateItemSchema = z.object({
  code: z.string().min(1).trim(),
  name: z.string().min(1).trim(),
  foreignName: z.string().optional(),
  itemGroupCode: z.coerce.number().int().optional(),
  inventoryUom: z.string().optional(),
  purchaseItem: z.coerce.boolean().default(false),
  salesItem: z.coerce.boolean().default(false),
  inventoryItem: z.coerce.boolean().default(false),
  defaultWarehouse: z.string().optional(),
  barcode: z.string().optional(),
});

export const UpdateItemSchema = CreateItemSchema.partial();

export const ItemListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
  search: z.string().optional(),
  itemGroupCode: z.coerce.number().int().optional(),
  purchaseItem: z.coerce.boolean().optional(),
  salesItem: z.coerce.boolean().optional(),
});

export const ItemGetParamSchema = z.object({
  code: z.string().min(1),
});
