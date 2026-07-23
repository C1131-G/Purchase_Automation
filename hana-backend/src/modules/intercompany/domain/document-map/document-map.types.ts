import type { IcObjectCode } from "@/modules/intercompany/infrastructure/object-codes";

export type IcDocumentMapStatus = "PENDING" | "SUCCESS" | "ERROR";

export type IcDocumentMap = {
  mappingId: number;
  sourceCompanyId: number;
  targetCompanyId: number | null;
  sourceObject: IcObjectCode | string;
  sourceDocEntry: string;
  sourceDocNum: string | null;
  targetObject: IcObjectCode | string | null;
  targetDocEntry: string | null;
  targetDocNum: string | null;
  status: IcDocumentMapStatus | string;
  errorMessage: string | null;
  sourceRemarksTag: string | null;
};

export type CreateDocumentMapInput = {
  sourceCompanyId: number;
  targetCompanyId?: number | null;
  sourceObject: string;
  sourceDocEntry: string;
  sourceDocNum?: string | null;
  targetObject?: string | null;
  targetDocEntry?: string | null;
  targetDocNum?: string | null;
  status?: string;
  errorMessage?: string | null;
  sourceRemarksTag?: string | null;
};
