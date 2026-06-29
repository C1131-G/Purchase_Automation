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
  address: z.string().optional(),
  address2: z.string().optional(),
  comments: z.string().optional(),
  docDate: z.string().optional(),
  draftDocEntry: z.coerce.number().optional(),
  isDraft: z.boolean().optional(),
  cardCode: z.string().optional(),
  cardName: z.string().optional(),
  attachments: z.array(z.any()).optional(),
  salesPersonCode: z.number().optional(),
  docDueDate: z.string().optional(),
  numAtCard: z.string().optional(),
  lines: z.array(z.any()).optional(),
});

export type InvoiceQuery = z.infer<typeof InvoiceQuerySchema>;
export type InvoiceDocNumLookupQuery = z.infer<typeof InvoiceDocNumLookupQuerySchema>;
export type CreateInvoiceInput = z.infer<typeof CreateInvoiceInputSchema>;
export type UpdateInvoiceInput = z.infer<typeof UpdateInvoiceInputSchema>;
