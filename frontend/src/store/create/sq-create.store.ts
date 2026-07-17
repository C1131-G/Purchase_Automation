import {
  createHeaderOnlyDraftStore,
  getAutoDocDueDate,
  getTodayISO,
} from "@/store/create/document-draft.factory";

/** SQHeaderState: Top-level sales quotation metadata. */
export interface SQHeaderState {
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
const getDefaultHeader = (): SQHeaderState => ({
  comments: "",
  docDate: getTodayISO(),
  docDueDate: getAutoDocDueDate(getTodayISO()),
  referenceNo: "",
  vendorCode: "",
  vendorName: "",
  warehouseCode: "",
});

const storeApi = createHeaderOnlyDraftStore<SQHeaderState>({
  getDefaultHeader,
  name: "sq-create-store",
});

export const useSQCreateStore = storeApi.useStore;
export const createSQCreateStoreInstance = storeApi.createStore;

export const useSQHeader = () => useSQCreateStore((state) => state.header);
export const useSetSQHeaderAction = () => useSQCreateStore((state) => state.setHeader);
export const useResetSQCreateAction = () => useSQCreateStore((state) => state.reset);
