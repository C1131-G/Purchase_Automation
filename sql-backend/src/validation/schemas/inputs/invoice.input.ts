import { z } from "@/config/zod";

export const InvoiceQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  page: z.coerce.number().min(1).default(1),
  search: z.string().optional(),
  status: z.enum(["O", "C"]).optional(),
});

export const InvoiceDocNumLookupQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(10),
  search: z.string().optional(),
});

export const CreateInvoiceInputSchema = z.object({
  cardCode: z.string().min(1),
  comments: z.string().optional(),
  docDate: z.string().transform((val) => new Date(val)),
  lines: z
    .array(
      z.object({
        itemCode: z.string(),
        quantity: z.number().positive(),
        taxCode: z.string().optional(),
        unitPrice: z.number().optional(),
      }),
    )
    .min(1),
});

export const UpdateInvoiceInputSchema = z.object({
  comments: z.string().optional(),
});

export type InvoiceQuery = z.infer<typeof InvoiceQuerySchema>;
export type InvoiceDocNumLookupQuery = z.infer<typeof InvoiceDocNumLookupQuerySchema>;
export type CreateInvoiceInput = z.infer<typeof CreateInvoiceInputSchema>;
export type UpdateInvoiceInput = z.infer<typeof UpdateInvoiceInputSchema>;
