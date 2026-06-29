import { z } from "@/config/zod";

export const SalesQuotationQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  page: z.coerce.number().min(1).default(1),
  search: z.string().optional(),
  status: z.enum(["O", "C", "Draft"]).optional(),
});

export const SalesQuotationDocNumLookupQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(10),
  search: z.string().optional(),
});

export const CreateSalesQuotationInputSchema = z.object({
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
  isDraft: z.boolean().optional(),
  draftDocEntry: z.coerce.number().optional(),
});

export const UpdateSalesQuotationInputSchema = z.object({
  comments: z.string().optional(),
  isDraft: z.boolean().optional(),
  draftDocEntry: z.coerce.number().optional(),
  cardCode: z.string().optional(),
});

export type SalesQuotationQuery = z.infer<typeof SalesQuotationQuerySchema>;
export type SalesQuotationDocNumLookupQuery = z.infer<typeof SalesQuotationDocNumLookupQuerySchema>;
export type CreateSalesQuotationInput = z.infer<typeof CreateSalesQuotationInputSchema>;
export type UpdateSalesQuotationInput = z.infer<typeof UpdateSalesQuotationInputSchema>;
