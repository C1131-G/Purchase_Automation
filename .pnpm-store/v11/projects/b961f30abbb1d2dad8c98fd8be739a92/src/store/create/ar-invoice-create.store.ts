import { create } from "zustand";

export interface ARInvoiceLineItemState {
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

export interface ARInvoiceHeaderState {
  vendorCode: string;
  vendorName: string;
  docDate: string;
  docDueDate: string;
  warehouseCode: string;
  referenceNo: string;
  comments: string;
}

interface ARInvoiceCreateState {
  header: ARInvoiceHeaderState;
  lines: ARInvoiceLineItemState[];
  setHeader: (patch: Partial<ARInvoiceHeaderState>) => void;
  addLine: (line: ARInvoiceLineItemState) => void;
  updateLine: (id: string, patch: Partial<ARInvoiceLineItemState>) => void;
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

const getDefaultHeader = (): ARInvoiceHeaderState => ({
  comments: "",
  docDate: getToday(),
  docDueDate: getAutoDocDueDate(getToday()),
  referenceNo: "",
  vendorCode: "",
  vendorName: "",
  warehouseCode: "",
});

export const useARInvoiceCreateStore = create<ARInvoiceCreateState>((set) => ({
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

export const useARInvoiceHeader = () => useARInvoiceCreateStore((state) => state.header);
export const useSetARInvoiceHeaderAction = () =>
  useARInvoiceCreateStore((state) => state.setHeader);
export const useResetARInvoiceCreateAction = () => useARInvoiceCreateStore((state) => state.reset);
