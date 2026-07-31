import type { Flow2ArInvoicePayload } from "../flow-2.types";
import type { IcDocumentLineInput } from "@/modules/intercompany/flows/shared/flow.types";

export type BuildArDraftLineInput = IcDocumentLineInput;

export type BuildArInvoiceInput = {
  buyerCustomerCode: string;
  remarksTag: string;
  /**
   * IC_COMPANY.DEFAULT_BRANCH_ID (e.g. 1). Used when line warehouse is missing
   * or not found on seller OWHS. Document BPL may switch to WH.BPLid when WH exists.
   */
  defaultBranchId: number | null;
  /** Seller SAP DB — optional; when set, align BPL from line warehouse without changing WH/UoM. */
  sapDbName?: string | null;
  /** Optional override: resolved branch after warehouse lookup. */
  documentBranchId?: number | null;
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
