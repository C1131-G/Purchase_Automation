// Dashboard constants — matching hana exactly.

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
export const INVENTORY_MODULES: DocumentModule[] = [
  "goodsReceipt",
  "goodsIssue",
  "transferRequest",
  "transfer",
];

export const MODULE_LABELS: Record<DocumentModule, string> = {
  apCreditNote: "AP Credit Memo",
  apInvoice: "AP Invoice",
  arCreditNote: "AR Credit Memo",
  arInvoice: "AR Invoice",
  goodsIssue: "Goods Issue",
  goodsReceipt: "Goods Receipt",
  grpo: "GRPO",
  incomingPayment: "Incoming Payment",
  itemMaster: "Item Master",
  outgoingPayment: "Outgoing Payment",
  purchaseOrder: "Purchase Order",
  purchaseQuotation: "Purchase Quotation",
  salesOrder: "Sales Order",
  salesQuotation: "Sales Quotation",
  transfer: "Inventory Transfer",
  transferRequest: "Transfer Request",
};

export const DASHBOARD_CACHE_TTL = 15 * 1000;

export const MODULE_HREFS: Record<DocumentModule, string> = {
  apCreditNote: "/purchase/ap-credit-memo",
  apInvoice: "/purchase/ap-invoice",
  arCreditNote: "/sales/ar-credit-memo",
  arInvoice: "/sales/ar-invoice",
  goodsIssue: "/inventory/goods-issue",
  goodsReceipt: "/inventory/goods-receipt",
  grpo: "/purchase/grpo",
  incomingPayment: "/sales/incoming-payment",
  itemMaster: "/inventory/item-master",
  outgoingPayment: "/purchase/outgoing-payment",
  purchaseOrder: "/purchase/orders",
  purchaseQuotation: "/purchase/quotations",
  salesOrder: "/sales/orders",
  salesQuotation: "/sales/quotations",
  transfer: "/inventory/transfer",
  transferRequest: "/inventory/transfer-request",
};

export const getAreaModules = (area: DashboardArea): DocumentModule[] => {
  if (area === "purchase") {
    return PURCHASE_MODULES;
  }
  if (area === "inventory") {
    return INVENTORY_MODULES;
  }
  return SALES_MODULES;
};
