import type { ProductRow } from "@/features/create-pages/create-shared/utils/create-order.types";
import {
  createLineDraftStore,
  getAutoDocDueDate,
  getTodayISO,
} from "@/store/create/document-draft.factory";

export type GRPOLineItemState = ProductRow & {
  baseQuantity?: number | undefined;
};

export interface GRPOHeaderState {
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

const getDefaultHeader = (): GRPOHeaderState => ({
  branchId: null,
  docDate: getTodayISO(),
  docDueDate: getAutoDocDueDate(getTodayISO()),
  referenceAutoFilled: false,
  referenceNo: "",
  remarks: "",
  vendorCode: "",
  vendorName: "",
  warehouseCode: "",
});

const storeApi = createLineDraftStore<GRPOHeaderState, GRPOLineItemState>({
  getDefaultHeader,
  name: "grpo-create-store",
});

export const useGRPOCreateStore = storeApi.useStore;
export const createGRPOCreateStoreInstance = storeApi.createStore;

export const useGRPOHeader = () => useGRPOCreateStore((state) => state.header);
export const useGRPOLines = () => useGRPOCreateStore((state) => state.lines);
export const useSetGRPOHeaderAction = () => useGRPOCreateStore((state) => state.setHeader);
export const useSetGRPOLinesAction = () => useGRPOCreateStore((state) => state.setLines);
export const useResetGRPOCreateAction = () => useGRPOCreateStore((state) => state.reset);
