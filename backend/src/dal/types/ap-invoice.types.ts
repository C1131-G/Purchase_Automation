import type { z } from "zod";

import type { InvoiceQuerySchema } from "@/validation/schemas/inputs/invoice.input";

export type InvoiceQuery = z.infer<typeof InvoiceQuerySchema>;

export type InvoiceFilters = InvoiceQuery;
