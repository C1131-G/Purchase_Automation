import type { Flow2ArDraftPayload } from "../flow-2.types";
import type { IcDocumentLineInput } from "@/modules/intercompany/flows/shared/flow.types";

export type BuildArDraftLineInput = IcDocumentLineInput;

export type BuildArDraftInput = {
  buyerCustomerCode: string;
  remarksTag: string;
  defaultBranchId: number | null;
  docDate?: unknown;
  docDueDate?: unknown;
  numAtCard?: unknown;
  comments?: string;
  lines?: BuildArDraftLineInput[];
  /** sourceCompanyId → targetCompanyId tax map resolver */
  mapTaxCode: (sourceTaxCode: string) => Promise<string>;
};

export type BuildArDraftResult = Flow2ArDraftPayload;
