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
  /** SAP business place (BPLId). Auto from warehouse on multi-branch companies. */
  branchId: number | null;
  /** NNM1.Series. Suggested from document type; user can switch on create. */
  series: number | null;
  referenceNo: string;
  comments: string;
}

/**
 * Pattern A: lines live in React state in create hooks.
 * Store owns header only — no dead lines APIs.
 */
const getDefaultHeader = (): SQHeaderState => ({
  branchId: null,
  series: null,
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
