import type { ProductRow } from "@/features/create-pages/create-shared/utils/create-order.types";
import { createLineDraftStore, getTodayISO } from "@/store/create/document-draft.factory";

export type APCreditMemoLineItemState = ProductRow & {
  baseQuantity?: number | undefined;
};

export interface APCreditMemoHeaderState {
  vendorCode: string;
  vendorName: string;
  docDate: string;
  docDueDate: string;
  warehouseCode: string;
  /** SAP business place (BPLId). Auto from warehouse on multi-branch companies. */
  branchId: number | null;
  referenceNo: string;
  remarks: string;
  referenceAutoFilled: boolean;
}

const getDefaultHeader = (): APCreditMemoHeaderState => ({
  branchId: null,
  docDate: getTodayISO(),
  docDueDate: getTodayISO(),
  referenceAutoFilled: false,
  referenceNo: "",
  remarks: "",
  vendorCode: "",
  vendorName: "",
  warehouseCode: "",
});

/** Credit memo uses same-as-docDate due date strategy (historical behavior). */
const storeApi = createLineDraftStore<APCreditMemoHeaderState, APCreditMemoLineItemState>({
  dueDateStrategy: "sameAsDocDate",
  getDefaultHeader,
  name: "ap-credit-memo-create-store",
});

export const useAPCreditMemoCreateStore = storeApi.useStore;
export const createAPCreditMemoCreateStoreInstance = storeApi.createStore;

export const useAPCreditMemoHeader = () => useAPCreditMemoCreateStore((state) => state.header);
export const useAPCreditMemoLines = () => useAPCreditMemoCreateStore((state) => state.lines);
export const useSetAPCreditMemoHeaderAction = () =>
  useAPCreditMemoCreateStore((state) => state.setHeader);
export const useSetAPCreditMemoLinesAction = () =>
  useAPCreditMemoCreateStore((state) => state.setLines);
export const useResetAPCreditMemoCreateAction = () =>
  useAPCreditMemoCreateStore((state) => state.reset);
