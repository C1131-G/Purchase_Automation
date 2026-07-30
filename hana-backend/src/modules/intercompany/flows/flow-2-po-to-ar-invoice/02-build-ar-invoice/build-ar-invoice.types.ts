import type { Flow2ArInvoicePayload } from "../flow-2.types";
import type { IcDocumentLineInput } from "@/modules/intercompany/flows/shared/flow.types";

export type BuildArDraftLineInput = IcDocumentLineInput;

export type BuildArInvoiceInput = {
  buyerCustomerCode: string;
  remarksTag: string;
  defaultBranchId: number | null;
  docDate?: unknown;
  docDueDate?: unknown;
  numAtCard?: unknown;
  comments?: string;
  /** Buyer PO identity for IC remarks chain. */
  poDocEntry: number;
  poDocNum?: number | null;
  lines?: BuildArDraftLineInput[];
  /**
   * Resolve seller sales tax for one AR line.
   * Return seller code; empty string → omit VatGroup (never buyer tax).
   */
  resolveLineTax: (input: { sourceTaxCode: string; itemCode: string }) => Promise<string>;
};

export type BuildArInvoiceResult = Flow2ArInvoicePayload;
