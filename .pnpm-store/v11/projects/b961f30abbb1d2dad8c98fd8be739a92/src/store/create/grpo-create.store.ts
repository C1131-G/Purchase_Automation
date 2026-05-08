import { create } from "zustand";

import type { ProductRow } from "@/features/create-pages/create-shared/utils/create-order.types";

export type GRPOLineItemState = ProductRow & {
  baseQuantity?: number | undefined;
};

export interface GRPOHeaderState {
  vendorCode: string;
  vendorName: string;
  docDate: string;
  docDueDate: string;
  warehouseCode: string;
  referenceNo: string;
  remarks: string;
  referenceAutoFilled: boolean;
}

interface GRPOCreateState {
  header: GRPOHeaderState;
  lines: GRPOLineItemState[];
  setHeader: (patch: Partial<GRPOHeaderState>) => void;
  setLines: (
    lines: GRPOLineItemState[] | ((prev: GRPOLineItemState[]) => GRPOLineItemState[]),
  ) => void;
  addLine: (line: GRPOLineItemState) => void;
  updateLine: (id: string, patch: Partial<GRPOLineItemState>) => void;
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

const getDefaultHeader = (): GRPOHeaderState => ({
  docDate: getToday(),
  docDueDate: getAutoDocDueDate(getToday()),
  referenceAutoFilled: false,
  referenceNo: "",
  remarks: "",
  vendorCode: "",
  vendorName: "",
  warehouseCode: "",
});

export const useGRPOCreateStore = create<GRPOCreateState>((set) => ({
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
      const docDueDateValue = patch.docDueDate;
      if (
        patch.docDate !== undefined &&
        (docDueDateValue === undefined ||
          docDueDateValue === null ||
          (typeof docDueDateValue === "string" && docDueDateValue.trim() === ""))
      ) {
        nextHeader.docDueDate = getAutoDocDueDate(String(patch.docDate));
      }
      return {
        ...prev,
        header: nextHeader,
      };
    }),
  setLines: (lines) =>
    set((prev) => ({
      ...prev,
      lines: typeof lines === "function" ? lines(prev.lines) : lines,
    })),
  updateLine: (id, patch) =>
    set((prev) => ({
      ...prev,
      lines: prev.lines.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    })),
}));

export const useGRPOHeader = () => useGRPOCreateStore((state) => state.header);
export const useGRPOLines = () => useGRPOCreateStore((state) => state.lines);
export const useSetGRPOHeaderAction = () => useGRPOCreateStore((state) => state.setHeader);
export const useSetGRPOLinesAction = () => useGRPOCreateStore((state) => state.setLines);
export const useResetGRPOCreateAction = () => useGRPOCreateStore((state) => state.reset);
