import { createCreditNote, updateCreditNote, cancelCreditNote } from "./ar-credit-memo.mutations";
import {
  getCreditNotes,
  getCreditNoteDocNums,
  getCreditNote,
  getCreditNoteByDocNum,
} from "./ar-credit-memo.queries";

export {
  getCreditNotes,
  getCreditNoteDocNums,
  getCreditNote,
  getCreditNoteByDocNum,
  createCreditNote,
  updateCreditNote,
  cancelCreditNote,
};

export const arCreditMemoService = {
  getCreditNotes,
  getCreditNoteDocNums,
  getCreditNote,
  getCreditNoteByDocNum,
  createCreditNote,
  updateCreditNote,
  cancelCreditNote,
};
