export type LotSetupKind = "serials" | "batches";

export type GrpoLotPendingAction = "save-new" | "view" | "close" | "draft";

export type LotSetupStep = LotSetupKind | "submit";

export interface LotSetupReturnTo {
  search?: Record<string, unknown>;
  to: string;
}

export interface ItemDefaultBin {
  binAbsEntry: number;
  binCode: string;
}
