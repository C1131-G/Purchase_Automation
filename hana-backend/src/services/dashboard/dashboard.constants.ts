import type { DashboardArea, DocumentModule } from "./dashboard.types";

export const PURCHASE_MODULES: DocumentModule[] = [
  "purchaseQuotation",
  "purchaseOrder",
  "grpo",
  "apInvoice",
  "apCreditNote",
  "outgoingPayment",
];

export const SALES_MODULES: DocumentModule[] = [
  "salesQuotation",
  "salesOrder",
  "arInvoice",
  "arCreditNote",
  "incomingPayment",
];

export const MODULE_LABELS: Record<DocumentModule, string> = {
  purchaseQuotation: "Purchase Quotation",
  purchaseOrder: "Purchase Order",
  grpo: "GRPO",
  apInvoice: "AP Invoice",
  apCreditNote: "AP Credit Memo",
  salesQuotation: "Sales Quotation",
  salesOrder: "Sales Order",
  arInvoice: "AR Invoice",
  arCreditNote: "AR Credit Memo",
  outgoingPayment: "Outgoing Payment",
  incomingPayment: "Incoming Payment",
};

export const MODULE_HREFS: Record<DocumentModule, string> = {
  purchaseQuotation: "/purchase/quotations",
  purchaseOrder: "/purchase/orders",
  grpo: "/purchase/grpo",
  apInvoice: "/purchase/ap-invoice",
  apCreditNote: "/purchase/ap-credit-memo",
  outgoingPayment: "/purchase/outgoing-payment",
  salesQuotation: "/sales/quotations",
  salesOrder: "/sales/orders",
  arInvoice: "/sales/ar-invoice",
  arCreditNote: "/sales/ar-credit-memo",
  incomingPayment: "/sales/incoming-payment",
};

export const getAreaModules = (area: DashboardArea): DocumentModule[] =>
  area === "purchase" ? PURCHASE_MODULES : SALES_MODULES;
