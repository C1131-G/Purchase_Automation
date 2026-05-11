import type { z } from "zod";

import type { AccountQuerySchema } from "@/validation/schemas/inputs/outgoing-payment-account.input";

export type AccountQuery = z.infer<typeof AccountQuerySchema>;
