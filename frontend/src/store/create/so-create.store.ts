import {
  createHeaderOnlyDraftStore,
  getAutoDocDueDate,
  getTodayISO,
} from "@/store/create/document-draft.factory";

/** SOHeaderState: Top-level sales order metadata (customer fields use vendor* naming). */
export interface SOHeaderState {
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
const getDefaultHeader = (): SOHeaderState => ({
  comments: "",
  docDate: getTodayISO(),
  docDueDate: getAutoDocDueDate(getTodayISO()),
  referenceNo: "",
  vendorCode: "",
  vendorName: "",
  warehouseCode: "",
});

const storeApi = createHeaderOnlyDraftStore<SOHeaderState>({
  getDefaultHeader,
  name: "so-create-store",
});

export const useSOCreateStore = storeApi.useStore;
export const createSOCreateStoreInstance = storeApi.createStore;

export const useSOHeader = () => useSOCreateStore((state) => state.header);
export const useSetSOHeaderAction = () => useSOCreateStore((state) => state.setHeader);
export const useResetSOCreateAction = () => useSOCreateStore((state) => state.reset);
