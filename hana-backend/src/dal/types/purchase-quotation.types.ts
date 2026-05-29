import type { z } from "zod";

import type { PurchaseQuotationQuerySchema } from "@/validation/schemas/inputs/purchase-quotation.input";

export type PurchaseQuotationQuery = z.infer<typeof PurchaseQuotationQuerySchema>;

export type PurchaseQuotationFilters = PurchaseQuotationQuery;
