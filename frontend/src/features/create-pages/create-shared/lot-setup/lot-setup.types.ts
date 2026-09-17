/**
 * Shared vocabulary for the GRPO lot setup (batch / serial) flow.
 * Batches and serials differ only in the allocation row they edit, so both
 * share one kind union instead of duplicating every type.
 */

/** Which allocation table is being set up for a GRPO line. */
export type LotSetupKind = "serials" | "batches";

/** Create-page action the user triggered that the lot setup modal intercepted. */
export type GrpoLotPendingAction = "save-new" | "view" | "close" | "draft";

/** Step in the lot wizard: a lot kind to confirm, or submit once all kinds are done. */
export type LotSetupStep = LotSetupKind | "submit";

/** Query-string state that must be restored on the create-GRPO route. */
export interface GrpoCreateSearch {
  draftDocEntry?: string;
  draftDocNum?: string;
  sourceDocNum?: string;
  sourceDocType?: "PurchaseOrder";
}

/** Where the lot modal navigates back to (create page, carrying its search state). */
export interface LotSetupReturnTo {
  search?: GrpoCreateSearch;
  to: string;
}

/**
 * Create-page fields that live in React state and must survive lot-page navigation.
 *
 * Attachments and address/warehouse/vendor inputs are not in the GRPO store, so
 * the lot session stashes them here while the modal is open.
 */
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

/** Item + warehouse default bin resolved for a document line (OIBQ / item defaults). */
export interface ItemDefaultBin {
  binAbsEntry: number;
  binCode: string;
}
