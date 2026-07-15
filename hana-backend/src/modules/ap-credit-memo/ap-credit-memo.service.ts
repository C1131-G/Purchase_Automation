import { createCreditNote, updateCreditNote, cancelCreditNote } from "./ap-credit-memo.mutations";
import {
  getCreditNotes,
  getCreditNoteDocNums,
  getCreditNoteByDocNum,
  getCreditNote,
} from "./ap-credit-memo.queries";

export {
  getCreditNotes,
  getCreditNoteDocNums,
  getCreditNoteByDocNum,
  getCreditNote,
  createCreditNote,
  updateCreditNote,
  cancelCreditNote,
};

export const apCreditMemoService = {
  getCreditNotes,
  getCreditNoteDocNums,
  getCreditNoteByDocNum,
  getCreditNote,
  createCreditNote,
  updateCreditNote,
  cancelCreditNote,
};
