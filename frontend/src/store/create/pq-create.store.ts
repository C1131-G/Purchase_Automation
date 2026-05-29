import { create } from "zustand";

/** PQLineItemState: Local state representation of a single sales document line. */
export interface PQLineItemState {
  id: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  vatGroup: string;
  taxRate: number;
  warehouseCode: string;
  discountPercent: number;
  productCode: string;
  productName: string;
  price: number;
  currency: string;
  stock: number;
  discountAmount: number;
  comment: string;
}

/** PQHeaderState: Top-level sales document metadata (Vendor, Dates, Warehouse). */
export interface PQHeaderState {
  vendorCode: string;
  vendorName: string;
  docDate: string;
  docDueDate: string;
  warehouseCode: string;
  referenceNo: string;
  comments: string;
}

/** PQCreateState: Orchestrates the draft Purchase Quotation state and mutation actions. */
interface PQCreateState {
  header: PQHeaderState;
  lines: PQLineItemState[];
  setHeader: (patch: Partial<PQHeaderState>) => void;
  addLine: (line: PQLineItemState) => void;
  updateLine: (id: string, patch: Partial<PQLineItemState>) => void;
  removeLine: (id: string) => void;
  reset: () => void;
}

const getToday = () => new Date().toISOString().slice(0, 10);
const toISODate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const getAutoDocDueDate = (docDate: string) => {
  if (!docDate) {
    return "";
  }
  const base = new Date(`${docDate}T00:00:00`);
  if (Number.isNaN(base.getTime())) {
    return "";
  }
  base.setMonth(base.getMonth() + 1);
  base.setDate(base.getDate() + 2);
  return toISODate(base);
};

const getDefaultHeader = (): PQHeaderState => ({
  comments: "",
  docDate: getToday(),
  docDueDate: getAutoDocDueDate(getToday()),
  referenceNo: "",
  vendorCode: "",
  vendorName: "",
  warehouseCode: "",
});

/**
 * usePQCreateStore: Global store for managing the creation lifecycle of Purchase Quotations.
 * Centralizes header data and line items before persistence.
 */
export const usePQCreateStore = create<PQCreateState>((set) => ({
  addLine: (line) =>
    set((prev) => ({
      ...prev,
      lines: [...prev.lines, line],
    })),
  header: getDefaultHeader(),
  lines: [],
  removeLine: (id) =>
    set((prev) => ({
      ...prev,
      lines: prev.lines.filter((line) => line.id !== id),
    })),
  reset: () =>
    set({
      header: getDefaultHeader(),
      lines: [],
    }),
  setHeader: (patch) =>
    set((prev) => {
      const nextHeader = { ...prev.header, ...patch };
      if (patch.docDate !== undefined && patch.docDueDate === undefined) {
        nextHeader.docDueDate = getAutoDocDueDate(String(patch.docDate));
      }
      return {
        ...prev,
        header: nextHeader,
      };
    }),
  updateLine: (id, patch) =>
    set((prev) => ({
      ...prev,
      lines: prev.lines.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    })),
}));

export const usePqHeader = () => usePQCreateStore((state) => state.header);

export const useSetPQHeaderAction = () => usePQCreateStore((state) => state.setHeader);
export const useResetPQCreateAction = () => usePQCreateStore((state) => state.reset);


