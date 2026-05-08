import type { z } from "zod";

import type { GRPOQuerySchema } from "@/validation/schemas/inputs/grpo.input";

export type GRPOQuery = z.infer<typeof GRPOQuerySchema>;

export type GRPOFilters = GRPOQuery;
