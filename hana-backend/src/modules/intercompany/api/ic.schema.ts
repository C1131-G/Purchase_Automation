import { z } from "zod";

import {
  sapDiscountPercentSchema,
  sapNonnegativeAmountSchema,
  sapPositiveAmountSchema,
  sapPositiveIntegerSchema,
  sapPositiveQuantitySchema,
} from "@/validation/schemas/inputs/sap-numeric-fields";
import { sapIsoDateSchema } from "@/validation/schemas/inputs/sap-document-fields";

const isoDateSchema = sapIsoDateSchema;

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
    deliveryDate: isoDateSchema.nullable().optional(),
    discount: sapDiscountPercentSchema.nullable().optional(),
    itemCode: z.unknown().optional(),
    lineNum: sapPositiveIntegerSchema.or(z.literal(0)),
    quantity: sapPositiveQuantitySchema.nullable().optional(),
    unitPrice: sapNonnegativeAmountSchema,
  })
  .strict();

const RfqSubmitLineSchema = RfqFillLineSchema.extend({
  deliveryDate: isoDateSchema,
  quantity: sapPositiveQuantitySchema,
  unitPrice: sapPositiveAmountSchema,
});

/** Seller fill: unit price, quoted qty, delivery date, discount %. itemCode rejected downstream. */
export const UpdateRfqBodySchema = z.object({
  lines: z.array(RfqFillLineSchema).min(1),
});

export type UpdateRfqBody = z.infer<typeof UpdateRfqBodySchema>;

export const ConfirmArInvoiceBodySchema = z
  .object({ arInvoiceDocEntry: sapPositiveIntegerSchema })
  .strict();

/**
 * Seller submit DRAFT → SUBMITTED.
 * Optional `lines` saves fill in the same request (avoids PUT then POST).
 */
export const SubmitRfqBodySchema = z
  .object({
    lines: z.array(RfqSubmitLineSchema).min(1).optional(),
  })
  .strict()
  .default({});

export type SubmitRfqBody = z.infer<typeof SubmitRfqBodySchema>;

export const RfqIdParamsSchema = z.object({
  id: z.string().regex(/^[1-9]\d*$/, "RFQ id must be a positive integer"),
});

export const PoDocEntryParamsSchema = z.object({
  poDocEntry: z.string().regex(/^[1-9]\d*$/, "PO document entry must be a positive integer"),
});

export const NotificationIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});
