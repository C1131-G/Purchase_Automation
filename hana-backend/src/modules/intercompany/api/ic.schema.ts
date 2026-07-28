import { z } from "zod";

export const IcHealthResponseSchema = z.object({
  data: z.object({
    module: z.literal("intercompany"),
    ok: z.literal(true),
    phase: z.string(),
  }),
  success: z.literal(true),
});

export type IcHealthResponse = z.infer<typeof IcHealthResponseSchema>;

/** Shared seller line patch: unit price, quoted qty, delivery date, discount %. */
const RfqFillLineSchema = z
  .object({
    deliveryDate: z.string().nullable().optional(),
    discount: z.number().nullable().optional(),
    itemCode: z.unknown().optional(),
    lineNum: z.number().int(),
    quantity: z.number().positive().nullable().optional(),
    unitPrice: z.number(),
  })
  .strict();

/** Seller fill: unit price, quoted qty, delivery date, discount %. itemCode rejected downstream. */
export const UpdateRfqBodySchema = z.object({
  lines: z.array(RfqFillLineSchema).min(1),
});

export type UpdateRfqBody = z.infer<typeof UpdateRfqBodySchema>;

/**
 * Seller submit DRAFT → SUBMITTED.
 * Optional `lines` saves fill in the same request (avoids PUT then POST).
 */
export const SubmitRfqBodySchema = z
  .object({
    lines: z.array(RfqFillLineSchema).min(1).optional(),
  })
  .strict()
  .default({});

export type SubmitRfqBody = z.infer<typeof SubmitRfqBodySchema>;

export const RfqIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const NotificationIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});
