import { z } from "zod";

export const RelationshipMapParamsSchema = z.object({
  docEntry: z.coerce.number().int().positive(),
  docType: z.enum([
    "sales-quotation",
    "sales-order",
    "ar-invoice",
    "ar-credit-memo",
    "incoming-payment",
    "purchase-quotation",
    "purchase-order",
    "grpo",
    "ap-invoice",
    "ap-credit-memo",
    "outgoing-payment",
    "goods-receipt",
    "goods-issue",
    "transfer-request",
    "transfer",
  ]),
});
