export type LotSetupKind = "serials" | "batches";

export type GrpoLotPendingAction = "save-new" | "view" | "close" | "draft";

export type LotSetupStep = LotSetupKind | "submit";

export interface GrpoCreateSearch {
  draftDocEntry?: string;
  draftDocNum?: string;
  sourceDocNum?: string;
  sourceDocType?: "PurchaseOrder" | "PurchaseQuotation";
}

export interface LotSetupReturnTo {
  search?: GrpoCreateSearch;
  to: string;
}

/** Create-page fields that live in React state and must survive lot-page navigation. */
export interface GrpoCreateFormChrome {
  attachments: Array<{
    attachmentDate: string;
    fileExtension?: string;
    fileName: string;
    freeText: string;
    id: string;
    sourcePath?: string;
    targetPath: string;
  }>;
  billToAddress: string;
  buyerInput: string;
  shipToAddress: string;
  vendorCode: string;
  vendorName: string;
  warehouseInput: string;
}

export interface ItemDefaultBin {
  binAbsEntry: number;
  binCode: string;
}
