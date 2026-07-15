import type { z } from "zod";

import type { InvoiceQuerySchema } from "./ap-invoice.schema";

export type InvoiceQuery = z.infer<typeof InvoiceQuerySchema>;

export type InvoiceFilters = InvoiceQuery;
