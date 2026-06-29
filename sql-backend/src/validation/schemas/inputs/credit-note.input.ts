import { z } from "@/config/zod";

export const CreditNoteQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  page: z.coerce.number().min(1).default(1),
  search: z.string().optional(),
  status: z.enum(["O", "C", "Draft"]).optional(),
});

export const CreditNoteDocNumLookupQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(10),
  search: z.string().optional(),
});

export const CreateCreditNoteInputSchema = z.object({
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

export const UpdateCreditNoteInputSchema = z.object({
  address: z.string().optional(),
  address2: z.string().optional(),
  comments: z.string().optional(),
  docDate: z.string().optional(),
  draftDocEntry: z.coerce.number().optional(),
  isDraft: z.boolean().optional(),
  attachments: z.array(z.any()).optional(),
  salesPersonCode: z.number().optional(),
  docDueDate: z.string().optional(),
  numAtCard: z.string().optional(),
  lines: z.array(z.any()).optional(),
});

export type CreditNoteQuery = z.infer<typeof CreditNoteQuerySchema>;
export type CreditNoteDocNumLookupQuery = z.infer<typeof CreditNoteDocNumLookupQuerySchema>;
export type CreateCreditNoteInput = z.infer<typeof CreateCreditNoteInputSchema>;
export type UpdateCreditNoteInput = z.infer<typeof UpdateCreditNoteInputSchema>;
