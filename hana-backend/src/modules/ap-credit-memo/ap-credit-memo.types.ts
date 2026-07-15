import type { z } from "zod";

import type { CreditNoteQuerySchema } from "./ap-credit-memo.schema";

export type CreditNoteQuery = z.infer<typeof CreditNoteQuerySchema>;

export type CreditNoteFilters = CreditNoteQuery;
