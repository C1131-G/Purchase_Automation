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
  itemMaster: "Item Master",
  goodsReceipt: "Goods Receipt",
  goodsIssue: "Goods Issue",
  transferRequest: "Transfer Request",
  transfer: "Inventory Transfer",
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
  itemMaster: "/inventory/item-master",
  goodsReceipt: "/inventory/goods-receipt",
  goodsIssue: "/inventory/goods-issue",
  transferRequest: "/inventory/transfer-request",
  transfer: "/inventory/transfer",
};

export const getAreaModules = (area: DashboardArea): DocumentModule[] => {
  if (area === "purchase") return PURCHASE_MODULES;
  if (area === "inventory") return INVENTORY_MODULES;
  return SALES_MODULES;
};
