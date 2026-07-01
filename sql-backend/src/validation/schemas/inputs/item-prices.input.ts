import { z } from "zod";

export const ItemPriceLineSchema = z.object({
  priceList: z.coerce.number().int(),
  price: z.coerce.number().positive().optional(),
});

export const ItemPriceUpdateSchema = z.object({
  itemCode: z.string().min(1),
  prices: z.array(ItemPriceLineSchema).min(1),
});

export const ItemPriceListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
  itemCode: z.string().optional(),
  priceList: z.coerce.number().int().optional(),
});
