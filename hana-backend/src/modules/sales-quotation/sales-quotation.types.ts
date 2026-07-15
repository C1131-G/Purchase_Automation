import type { z } from "zod";

import type { SalesQuotationQuerySchema } from "./sales-quotation.schema";

export type SalesQuotationQuery = z.infer<typeof SalesQuotationQuerySchema>;

export type SalesQuotationFilters = SalesQuotationQuery;
