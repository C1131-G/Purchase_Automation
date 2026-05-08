import { create } from "zustand";

/** SOLineItemState: Local state representation of a single sales document line. */
export interface SOLineItemState {
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

/** SOHeaderState: Top-level sales document metadata (Customer, Dates, Warehouse). */
export interface SOHeaderState {
  vendorCode: string;
  vendorName: string;
  docDate: string;
  docDueDate: string;
  warehouseCode: string;
  referenceNo: string;
  comments: string;
}

/** SOCreateState: Orchestrates the draft Sales Order state and mutation actions. */
interface SOCreateState {
  header: SOHeaderState;
  lines: SOLineItemState[];
  setHeader: (patch: Partial<SOHeaderState>) => void;
  addLine: (line: SOLineItemState) => void;
  updateLine: (id: string, patch: Partial<SOLineItemState>) => void;
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

const getDefaultHeader = (): SOHeaderState => ({
  comments: "",
  docDate: getToday(),
  docDueDate: getAutoDocDueDate(getToday()),
  referenceNo: "",
  vendorCode: "",
  vendorName: "",
  warehouseCode: "",
});

/**
 * useSOCreateStore: Global store for managing the creation lifecycle of Sales Orders.
 * Centralizes header data and line items before persistence.
 */
export const useSOCreateStore = create<SOCreateState>((set) => ({
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

export const useSOHeader = () => useSOCreateStore((state) => state.header);

export const useSetSOHeaderAction = () => useSOCreateStore((state) => state.setHeader);
export const useResetSOCreateAction = () => useSOCreateStore((state) => state.reset);
