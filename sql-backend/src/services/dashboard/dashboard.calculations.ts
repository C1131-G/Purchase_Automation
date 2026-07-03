// Dashboard calculations — matching hana exactly.

import type { DocumentModule, RawDashboardDocument } from "./dashboard.types";

export const clampPercent = (value: number): number => {
  if (!Number.isFinite(value) || value < 0) return 0;
  if (value > 100) return 100;
  return Number(value.toFixed(2));
};

export const calculateRatio = (value: number, base: number): number => {
  if (base <= 0) return 0;
  return clampPercent((value / base) * 100);
};

export const calculateTrend = (currentValue: number, previousValue: number): number => {
  if (previousValue <= 0) return currentValue > 0 ? 100 : 0;
  return Number((((currentValue - previousValue) / previousValue) * 100).toFixed(2));
};

export const normalizeStatus = (value: string): string => {
  if (value === "O") return "Open";
  if (value === "C") return "Closed";
  return value;
};

const isInvoiceModule = (module: DocumentModule): boolean =>
  module === "apInvoice" || module === "arInvoice";

const isStatusOpen = (doc: RawDashboardDocument): boolean => {
  const status = doc.docStatus.toLowerCase();
  return status === "o" || status.includes("open");
};

export const getOpenValue = (doc: RawDashboardDocument): number => {
  if (isInvoiceModule(doc.module)) {
    const unpaid = doc.docTotal - doc.paidToDate;
    return unpaid > 0 ? Number(unpaid.toFixed(2)) : 0;
  }
  return isStatusOpen(doc) ? doc.docTotal : 0;
};

export const isOpenDocument = (doc: RawDashboardDocument): boolean => getOpenValue(doc) > 0;

export const sumTotals = (docs: RawDashboardDocument[]): number =>
  Number(docs.reduce((total, doc) => total + doc.docTotal, 0).toFixed(2));

export const sumOpenTotals = (docs: RawDashboardDocument[]): number =>
  Number(docs.reduce((total, doc) => total + getOpenValue(doc), 0).toFixed(2));

export const countOpenDocuments = (docs: RawDashboardDocument[]): number =>
  docs.filter((doc) => isOpenDocument(doc)).length;

// Legacy compat
export const calculateChange = calculateTrend;
export const calculatePercentage = calculateRatio;
