import type { z } from "zod";

import type { GRPOQuerySchema } from "./grpo.schema";

export type GRPOQuery = z.infer<typeof GRPOQuerySchema>;

export type GRPOFilters = GRPOQuery;
