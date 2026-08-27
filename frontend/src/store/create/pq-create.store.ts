import {
  createHeaderOnlyDraftStore,
  getLocalTodayISO,
} from "@/store/create/document-draft.factory";
import {
  addCalendarDays,
  addCalendarMonths,
} from "@/features/create-pages/create-shared/utils/create-order.utils";

/** PQHeaderState: Top-level purchase quotation metadata. */
export interface PQHeaderState {
  vendorCode: string;
  vendorName: string;
  docDate: string;
  docDueDate: string;
  /** Header Required Date (SAP RequriedDate) + line ReqDate source. Future dates only in UI. */
  requiredDate: string;
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
const getDefaultHeader = (): PQHeaderState => {
  const today = getLocalTodayISO();
  const requiredDate = addCalendarMonths(today, 1);
  const autoDue = addCalendarDays(requiredDate, 2);
  return {
    comments: "",
    docDate: today,
    docDueDate: autoDue,
    requiredDate,
    branchId: null,
    series: null,
    referenceNo: "",
    vendorCode: "",
    vendorName: "",
    warehouseCode: "",
  };
};

const storeApi = createHeaderOnlyDraftStore<PQHeaderState>({
  getDefaultHeader,
  name: "pq-create-store",
});

export const usePQCreateStore = storeApi.useStore;
export const createPQCreateStoreInstance = storeApi.createStore;

export const usePqHeader = () => usePQCreateStore((state) => state.header);
export const useSetPQHeaderAction = () => usePQCreateStore((state) => state.setHeader);
export const useResetPQCreateAction = () => usePQCreateStore((state) => state.reset);
