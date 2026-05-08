import type { z } from "zod";

import type { SalesQuotationQuerySchema } from "@/validation/schemas/inputs/sales-quotation.input";

export type SalesQuotationQuery = z.infer<typeof SalesQuotationQuerySchema>;

export type SalesQuotationFilters = SalesQuotationQuery;
