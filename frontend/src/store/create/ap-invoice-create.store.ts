import type { ProductRow } from "@/features/create-pages/create-shared/utils/create-order.types";
import {
  createLineDraftStore,
  getAutoDocDueDate,
  getTodayISO,
} from "@/store/create/document-draft.factory";

export type APInvoiceLineItemState = ProductRow & {
  baseQuantity?: number | undefined;
};

export interface APInvoiceHeaderState {
  vendorCode: string;
  vendorName: string;
  docDate: string;
  docDueDate: string;
  warehouseCode: string;
  /** SAP business place (BPLId). Auto from warehouse on multi-branch companies. */
  branchId: number | null;
  /** NNM1.Series. Suggested from document type; user can switch on create. */
  series: number | null;
  referenceNo: string;
  remarks: string;
  referenceAutoFilled: boolean;
}

const getDefaultHeader = (): APInvoiceHeaderState => ({
  branchId: null,
  series: null,
  docDate: getTodayISO(),
  docDueDate: getAutoDocDueDate(getTodayISO()),
  referenceAutoFilled: false,
  referenceNo: "",
  remarks: "",
  vendorCode: "",
  vendorName: "",
  warehouseCode: "",
});

const storeApi = createLineDraftStore<APInvoiceHeaderState, APInvoiceLineItemState>({
  getDefaultHeader,
  name: "ap-invoice-create-store",
});

export const useAPInvoiceCreateStore = storeApi.useStore;
export const createAPInvoiceCreateStoreInstance = storeApi.createStore;

export const useAPInvoiceHeader = () => useAPInvoiceCreateStore((state) => state.header);
export const useAPInvoiceLines = () => useAPInvoiceCreateStore((state) => state.lines);
export const useSetAPInvoiceHeaderAction = () =>
  useAPInvoiceCreateStore((state) => state.setHeader);
export const useSetAPInvoiceLinesAction = () => useAPInvoiceCreateStore((state) => state.setLines);
export const useResetAPInvoiceCreateAction = () => useAPInvoiceCreateStore((state) => state.reset);
