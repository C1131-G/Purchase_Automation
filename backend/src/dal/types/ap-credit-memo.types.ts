import type { z } from "zod";

import type { CreditNoteQuerySchema } from "@/validation/schemas/inputs/credit-note.input";

export type CreditNoteQuery = z.infer<typeof CreditNoteQuerySchema>;

export type CreditNoteFilters = CreditNoteQuery;
