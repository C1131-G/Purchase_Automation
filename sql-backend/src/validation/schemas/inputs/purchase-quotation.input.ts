import { z } from "@/config/zod";

export const PurchaseQuotationQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  page: z.coerce.number().min(1).default(1),
  search: z.string().optional(),
  status: z.enum(["O", "C"]).optional(),
});

export const PurchaseQuotationDocNumLookupQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(10),
  search: z.string().optional(),
});

export const CreatePurchaseQuotationInputSchema = z.object({
  cardCode: z.string().min(1),
  comments: z.string().optional(),
  docDate: z.string().transform((val) => new Date(val)),
  lines: z
    .array(
      z.object({
        itemCode: z.string(),
        quantity: z.number().positive(),
        unitPrice: z.number().optional(),
      }),
    )
    .min(1),
});

export const UpdatePurchaseQuotationInputSchema = z.object({
  comments: z.string().optional(),
});

export type PurchaseQuotationQuery = z.infer<typeof PurchaseQuotationQuerySchema>;
export type PurchaseQuotationDocNumLookupQuery = z.infer<
  typeof PurchaseQuotationDocNumLookupQuerySchema
>;
export type CreatePurchaseQuotationInput = z.infer<typeof CreatePurchaseQuotationInputSchema>;
export type UpdatePurchaseQuotationInput = z.infer<typeof UpdatePurchaseQuotationInputSchema>;
