import { z } from "@/config/zod";

export const PurchaseOrderQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  page: z.coerce.number().min(1).default(1),
  search: z.string().optional(),
  status: z.enum(["O", "C"]).optional(),
});

export const PurchaseOrderDocNumLookupQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(10),
  search: z.string().optional(),
});

export const CreatePurchaseOrderInputSchema = z.object({
  cardCode: z.string().min(1),
  comments: z.string().optional(),
  docDate: z.string().transform((val) => new Date(val)),
  lines: z
    .array(
      z.object({
        itemCode: z.string(),
        quantity: z.number().positive(),
        unitPrice: z.number().optional(),
        warehouse: z.string().optional(),
      }),
    )
    .min(1),
});

export const UpdatePurchaseOrderInputSchema = z.object({
  comments: z.string().optional(),
});

export type PurchaseOrderQuery = z.infer<typeof PurchaseOrderQuerySchema>;
export type PurchaseOrderDocNumLookupQuery = z.infer<typeof PurchaseOrderDocNumLookupQuerySchema>;
export type CreatePurchaseOrderInput = z.infer<typeof CreatePurchaseOrderInputSchema>;
export type UpdatePurchaseOrderInput = z.infer<typeof UpdatePurchaseOrderInputSchema>;
