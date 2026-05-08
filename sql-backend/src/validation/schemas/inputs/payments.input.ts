import { z } from "@/config/zod";

export const PaymentQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  page: z.coerce.number().min(1).default(1),
  search: z.string().optional(),
  status: z.enum(["O", "C"]).optional(),
});

export const PaymentDocNumLookupQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(10),
  search: z.string().optional(),
});

export const CreatePaymentInputSchema = z.object({
  cardCode: z.string().min(1),
  cashSum: z.number().optional(),
  comments: z.string().optional(),
  docDate: z.string().transform((val) => new Date(val)),
  transferSum: z.number().optional(),
});

export const UpdatePaymentInputSchema = z.object({
  comments: z.string().optional(),
});

export type PaymentQuery = z.infer<typeof PaymentQuerySchema>;
export type PaymentDocNumLookupQuery = z.infer<typeof PaymentDocNumLookupQuerySchema>;
export type CreatePaymentInput = z.infer<typeof CreatePaymentInputSchema>;
export type UpdatePaymentInput = z.infer<typeof UpdatePaymentInputSchema>;
