import type { z } from "zod";

import type { AccountQuerySchema } from "./outgoing-payment.schema";

export type AccountQuery = z.infer<typeof AccountQuerySchema>;
