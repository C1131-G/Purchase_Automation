import type { z } from "zod";

import type { PaymentQuerySchema } from "@/validation/schemas/inputs/payments.input";

export type PaymentQuery = z.infer<typeof PaymentQuerySchema>;

export type PaymentFilters = PaymentQuery;
