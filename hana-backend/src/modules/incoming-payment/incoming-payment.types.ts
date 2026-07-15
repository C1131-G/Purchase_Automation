import type { z } from "zod";

import type { PaymentQuerySchema } from "./incoming-payment.schema";

export type PaymentQuery = z.infer<typeof PaymentQuerySchema>;

export type PaymentFilters = PaymentQuery;
