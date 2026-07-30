import type { IcRfqHeader, IcRfqLine } from "@/modules/intercompany/domain/rfq/rfq.types";

export type ConvertRfqInput = {
  rfqId: number;
  actorCompanyId: number;
};

export type ApplyPricesInput = {
  buyerCompanyId: number;
  draftEntry: number;
  lines: IcRfqLine[];
};

export type BuildSqPayloadInput = {
  buyerCustomerCode: string;
  lines: IcRfqLine[];
  remarksTag: string;
  resolveLineTax: (input: { sourceTaxCode: string; itemCode: string }) => Promise<string>;
  defaultBranchId?: number | null;
};

export type ConvertSuccessDetail = {
  rfq: IcRfqHeader;
  pqDocEntry: number;
  pqDocNum?: number;
  sqDocEntry: number;
  sqDocNum?: number;
  mappingId?: number;
};
