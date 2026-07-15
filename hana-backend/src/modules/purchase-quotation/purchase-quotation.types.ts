import type { z } from "zod";

import type { PurchaseQuotationQuerySchema } from "./purchase-quotation.schema";

export type PurchaseQuotationQuery = z.infer<typeof PurchaseQuotationQuerySchema>;

export type PurchaseQuotationFilters = PurchaseQuotationQuery;
