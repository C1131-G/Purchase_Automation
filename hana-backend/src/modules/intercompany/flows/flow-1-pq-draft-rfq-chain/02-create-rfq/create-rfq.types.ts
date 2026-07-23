import type { IcDocumentLineInput } from "@/modules/intercompany/flows/shared/flow.types";
import type { ResolvePartnerResult } from "@/modules/intercompany/routing/resolve-partner/resolve-partner.types";
import type { IcRfqHeader } from "@/modules/intercompany/domain/rfq/rfq.types";

export type CreateRfqFromCaptureInput = {
  partner: ResolvePartnerResult;
  sourceDocEntry: string;
  sourceDocNum: string | null;
  remarksTag: string;
  lines?: IcDocumentLineInput[];
  createdBy?: string | null;
};

export type CreateRfqFromCaptureResult = {
  rfq: IcRfqHeader;
  mappingId: number;
  created: boolean;
};
