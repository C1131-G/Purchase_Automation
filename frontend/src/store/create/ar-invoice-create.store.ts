import {
  createHeaderOnlyDraftStore,
  getAutoDocDueDate,
  getTodayISO,
} from "@/store/create/document-draft.factory";

export interface ARInvoiceHeaderState {
  vendorCode: string;
  vendorName: string;
  docDate: string;
  docDueDate: string;
  warehouseCode: string;
  referenceNo: string;
  comments: string;
}

/**
 * Pattern A: lines live in React state in create hooks.
 * Store owns header only — no dead lines APIs.
 */
const getDefaultHeader = (): ARInvoiceHeaderState => ({
  comments: "",
  docDate: getTodayISO(),
  docDueDate: getAutoDocDueDate(getTodayISO()),
  referenceNo: "",
  vendorCode: "",
  vendorName: "",
  warehouseCode: "",
});

const storeApi = createHeaderOnlyDraftStore<ARInvoiceHeaderState>({
  getDefaultHeader,
  name: "ar-invoice-create-store",
});

export const useARInvoiceCreateStore = storeApi.useStore;
export const createARInvoiceCreateStoreInstance = storeApi.createStore;

export const useARInvoiceHeader = () => useARInvoiceCreateStore((state) => state.header);
export const useSetARInvoiceHeaderAction = () =>
  useARInvoiceCreateStore((state) => state.setHeader);
export const useResetARInvoiceCreateAction = () => useARInvoiceCreateStore((state) => state.reset);
