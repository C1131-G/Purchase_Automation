export interface CreditNoteQuery {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export interface CreditNoteDocNumLookupQuery {
  search?: string;
  limit?: number;
}
