import { apCreditMemoLines } from "@/db/schema/ap-credit-memo-lines";
import { apCreditMemos } from "@/db/schema/ap-credit-memos";
import { apInvoiceLines } from "@/db/schema/ap-invoice-lines";
import { apInvoices } from "@/db/schema/ap-invoices";
import { arCreditMemoLines } from "@/db/schema/ar-credit-memo-lines";
import { arCreditMemos } from "@/db/schema/ar-credit-memos";
import { arInvoiceLines } from "@/db/schema/ar-invoice-lines";
import { arInvoices } from "@/db/schema/ar-invoices";
import { grpo } from "@/db/schema/grpo";
import { grpoLines } from "@/db/schema/grpo-lines";
import { purchaseOrderLines } from "@/db/schema/purchase-order-lines";
import { purchaseOrders } from "@/db/schema/purchase-orders";
import { purchaseQuotationLines } from "@/db/schema/purchase-quotation-lines";
import { purchaseQuotations } from "@/db/schema/purchase-quotations";
import { salesOrderLines } from "@/db/schema/sales-order-lines";
import { salesOrders } from "@/db/schema/sales-orders";
import { salesQuotationLines } from "@/db/schema/sales-quotation-lines";
import { salesQuotations } from "@/db/schema/sales-quotations";
import type { LooseTable } from "@/types/db.types";

export interface DocumentLinkChildMapping {
  childType: number;
  childHeaderTable: LooseTable;
  childLineTable: LooseTable;
}

export interface DocumentLinkRegistryEntry {
  parentType: number;
  headerTable: LooseTable;
  lineTable: LooseTable;
  childDocs: DocumentLinkChildMapping[];
}

export const DOCUMENT_REGISTRY: Record<number, DocumentLinkRegistryEntry> = {
  // Purchase Quotation (540000006)
  540_000_006: {
    parentType: 540_000_006,
    headerTable: purchaseQuotations,
    lineTable: purchaseQuotationLines,
    childDocs: [
      {
        childType: 22,
        childHeaderTable: purchaseOrders,
        childLineTable: purchaseOrderLines,
      },
    ],
  },
  // Purchase Order (22)
  22: {
    parentType: 22,
    headerTable: purchaseOrders,
    lineTable: purchaseOrderLines,
    childDocs: [
      {
        childType: 20,
        childHeaderTable: grpo,
        childLineTable: grpoLines,
      },
      {
        childType: 18,
        childHeaderTable: apInvoices,
        childLineTable: apInvoiceLines,
      },
    ],
  },
  // GRPO (20)
  20: {
    parentType: 20,
    headerTable: grpo,
    lineTable: grpoLines,
    childDocs: [
      {
        childType: 18,
        childHeaderTable: apInvoices,
        childLineTable: apInvoiceLines,
      },
    ],
  },
  // AP Invoice (18)
  18: {
    parentType: 18,
    headerTable: apInvoices,
    lineTable: apInvoiceLines,
    childDocs: [
      {
        childType: 19,
        childHeaderTable: apCreditMemos,
        childLineTable: apCreditMemoLines,
      },
    ],
  },
  // Sales Quotation (23)
  23: {
    parentType: 23,
    headerTable: salesQuotations,
    lineTable: salesQuotationLines,
    childDocs: [
      {
        childType: 17,
        childHeaderTable: salesOrders,
        childLineTable: salesOrderLines,
      },
      {
        childType: 13,
        childHeaderTable: arInvoices,
        childLineTable: arInvoiceLines,
      },
    ],
  },
  // Sales Order (17)
  17: {
    parentType: 17,
    headerTable: salesOrders,
    lineTable: salesOrderLines,
    childDocs: [
      {
        childType: 13,
        childHeaderTable: arInvoices,
        childLineTable: arInvoiceLines,
      },
    ],
  },
  // AR Invoice (13)
  13: {
    parentType: 13,
    headerTable: arInvoices,
    lineTable: arInvoiceLines,
    childDocs: [
      {
        childType: 16,
        childHeaderTable: arCreditMemos,
        childLineTable: arCreditMemoLines,
      },
    ],
  },
};
