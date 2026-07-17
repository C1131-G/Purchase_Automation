import {
  createHeaderOnlyDraftStore,
  getAutoDocDueDate,
  getTodayISO,
} from "@/store/create/document-draft.factory";

/** POHeaderState: Top-level document metadata (Vendor, Dates, Warehouse). */
export interface POHeaderState {
  vendorCode: string;
  vendorName: string;
  docDate: string;
  docDueDate: string;
  warehouseCode: string;
  referenceNo: string;
  comments: string;
}

/**
 * Pattern A: lines live in React state (usePoProducts / usePurchaseOrderCreate).
 * Store owns header only — no dead lines APIs.
 */
const getDefaultHeader = (): POHeaderState => ({
  comments: "",
  docDate: getTodayISO(),
  docDueDate: getAutoDocDueDate(getTodayISO()),
  referenceNo: "",
  vendorCode: "",
  vendorName: "",
  warehouseCode: "",
});

const storeApi = createHeaderOnlyDraftStore<POHeaderState>({
  getDefaultHeader,
  name: "po-create-store",
});

export const usePOCreateStore = storeApi.useStore;
export const createPOCreateStoreInstance = storeApi.createStore;

export const usePOHeader = () => usePOCreateStore((state) => state.header);
export const useSetPOHeaderAction = () => usePOCreateStore((state) => state.setHeader);
export const useResetPOCreateAction = () => usePOCreateStore((state) => state.reset);
