import {
  createHeaderOnlyDraftStore,
  getAutoDocDueDate,
  getTodayISO,
} from "@/store/create/document-draft.factory";

/** PQHeaderState: Top-level purchase quotation metadata. */
export interface PQHeaderState {
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
const getDefaultHeader = (): PQHeaderState => ({
  comments: "",
  docDate: getTodayISO(),
  docDueDate: getAutoDocDueDate(getTodayISO()),
  referenceNo: "",
  vendorCode: "",
  vendorName: "",
  warehouseCode: "",
});

const storeApi = createHeaderOnlyDraftStore<PQHeaderState>({
  getDefaultHeader,
  name: "pq-create-store",
});

export const usePQCreateStore = storeApi.useStore;
export const createPQCreateStoreInstance = storeApi.createStore;

export const usePqHeader = () => usePQCreateStore((state) => state.header);
export const useSetPQHeaderAction = () => usePQCreateStore((state) => state.setHeader);
export const useResetPQCreateAction = () => usePQCreateStore((state) => state.reset);
