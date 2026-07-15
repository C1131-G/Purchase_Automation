// Registers OpenAPI paths for all document modules (matches Express mounts).

import {
  CreateApCreditMemoSchema,
  UpdateApCreditMemoSchema,
} from "@/modules/ap-credit-memo/ap-credit-memo.schema";
import {
  CreateApInvoiceSchema,
  UpdateApInvoiceSchema,
} from "@/modules/ap-invoice/ap-invoice.schema";
import {
  CreateArCreditMemoSchema,
  UpdateArCreditMemoSchema,
} from "@/modules/ar-credit-memo/ar-credit-memo.schema";
import {
  CreateArInvoiceSchema,
  UpdateArInvoiceSchema,
} from "@/modules/ar-invoice/ar-invoice.schema";
import {
  CreateGoodsIssueSchema,
  UpdateGoodsIssueSchema,
} from "@/modules/goods-issue/goods-issue.schema";
import {
  CreateGoodsReceiptSchema,
  UpdateGoodsReceiptSchema,
} from "@/modules/goods-receipt/goods-receipt.schema";
import { CreateGrpoSchema, UpdateGrpoSchema } from "@/modules/grpo/grpo.schema";
import {
  CreatePurchaseOrderSchema,
  UpdatePurchaseOrderSchema,
} from "@/modules/purchase-order/purchase-order.schema";
import {
  CreatePurchaseQuotationSchema,
  UpdatePurchaseQuotationSchema,
} from "@/modules/purchase-quotation/purchase-quotation.schema";
import {
  CreateSalesOrderSchema,
  UpdateSalesOrderSchema,
} from "@/modules/sales-order/sales-order.schema";
import {
  CreateSalesQuotationSchema,
  UpdateSalesQuotationSchema,
} from "@/modules/sales-quotation/sales-quotation.schema";
import { CreateInventoryTransferSchema } from "@/modules/transfer/transfer.schema";
import { CreateInventoryTransferRequestSchema } from "@/modules/transfer-request/transfer-request.schema";

import { registerDocumentPaths } from "./swagger-document-path-register";

export type { DocumentPathOptions } from "./swagger-document-path-register";
export { registerDocumentPaths } from "./swagger-document-path-register";

export const registerAllDocumentModulePaths = () => {
  registerDocumentPaths({
    entityPath: "purchase-orders",
    entityLabel: "Purchase order",
    createSchema: CreatePurchaseOrderSchema,
    updateSchema: UpdatePurchaseOrderSchema,
    schemaNames: {
      create: "CreatePurchaseOrderInput",
      update: "UpdatePurchaseOrderInput",
    },
  });
  registerDocumentPaths({
    entityPath: "purchase-quotations",
    entityLabel: "Purchase quotation",
    createSchema: CreatePurchaseQuotationSchema,
    updateSchema: UpdatePurchaseQuotationSchema,
    schemaNames: {
      create: "CreatePurchaseQuotationInput",
      update: "UpdatePurchaseQuotationInput",
    },
  });
  registerDocumentPaths({
    entityPath: "grpos",
    entityLabel: "GRPO",
    createSchema: CreateGrpoSchema,
    updateSchema: UpdateGrpoSchema,
    schemaNames: { create: "CreateGrpoInput", update: "UpdateGrpoInput" },
  });
  registerDocumentPaths({
    entityPath: "ap-invoices",
    entityLabel: "AP Invoice",
    createSchema: CreateApInvoiceSchema,
    updateSchema: UpdateApInvoiceSchema,
    schemaNames: { create: "CreateApInvoiceInput", update: "UpdateApInvoiceInput" },
  });
  registerDocumentPaths({
    entityPath: "ap-credit-memos",
    entityLabel: "AP Credit memo",
    createSchema: CreateApCreditMemoSchema,
    updateSchema: UpdateApCreditMemoSchema,
    schemaNames: {
      create: "CreateApCreditMemoInput",
      update: "UpdateApCreditMemoInput",
    },
  });
  registerDocumentPaths({
    entityPath: "sales-orders",
    entityLabel: "Sales order",
    createSchema: CreateSalesOrderSchema,
    updateSchema: UpdateSalesOrderSchema,
    schemaNames: { create: "CreateSalesOrderInput", update: "UpdateSalesOrderInput" },
  });
  registerDocumentPaths({
    entityPath: "sales-quotations",
    entityLabel: "Sales quotation",
    createSchema: CreateSalesQuotationSchema,
    updateSchema: UpdateSalesQuotationSchema,
    schemaNames: {
      create: "CreateSalesQuotationInput",
      update: "UpdateSalesQuotationInput",
    },
  });
  registerDocumentPaths({
    entityPath: "ar-invoices",
    entityLabel: "AR Invoice",
    createSchema: CreateArInvoiceSchema,
    updateSchema: UpdateArInvoiceSchema,
    schemaNames: { create: "CreateArInvoiceInput", update: "UpdateArInvoiceInput" },
  });
  registerDocumentPaths({
    entityPath: "ar-credit-memos",
    entityLabel: "AR Credit memo",
    createSchema: CreateArCreditMemoSchema,
    updateSchema: UpdateArCreditMemoSchema,
    schemaNames: {
      create: "CreateArCreditMemoInput",
      update: "UpdateArCreditMemoInput",
    },
  });
  registerDocumentPaths({
    entityPath: "goods-receipts",
    entityLabel: "Goods receipt",
    supportsCancel: false,
    supportsUpdate: true,
    createSchema: CreateGoodsReceiptSchema,
    updateSchema: UpdateGoodsReceiptSchema,
    schemaNames: {
      create: "CreateGoodsReceiptInput",
      update: "UpdateGoodsReceiptInput",
    },
  });
  registerDocumentPaths({
    entityPath: "goods-issues",
    entityLabel: "Goods issue",
    supportsCancel: false,
    supportsUpdate: true,
    createSchema: CreateGoodsIssueSchema,
    updateSchema: UpdateGoodsIssueSchema,
    schemaNames: { create: "CreateGoodsIssueInput", update: "UpdateGoodsIssueInput" },
  });
  registerDocumentPaths({
    entityPath: "inventory-transfers",
    entityLabel: "Inventory transfer",
    supportsCancel: false,
    supportsUpdate: false,
    createSchema: CreateInventoryTransferSchema,
    schemaNames: { create: "CreateInventoryTransferInput" },
  });
  registerDocumentPaths({
    entityPath: "transfers",
    entityLabel: "Inventory transfer",
    supportsCancel: false,
    supportsUpdate: false,
    createSchema: CreateInventoryTransferSchema,
  });
  registerDocumentPaths({
    entityPath: "inventory-transfer-requests",
    entityLabel: "Inventory transfer request",
    createSchema: CreateInventoryTransferRequestSchema,
    schemaNames: { create: "CreateInventoryTransferRequestInput" },
  });
  registerDocumentPaths({
    entityPath: "transfer-requests",
    entityLabel: "Inventory transfer request",
  });
  registerDocumentPaths({
    entityPath: "incoming-payments",
    entityLabel: "Incoming payment",
    supportsCancel: true,
    supportsUpdate: false,
  });
  registerDocumentPaths({
    entityPath: "outgoing-payments",
    entityLabel: "Outgoing payment",
    supportsCancel: true,
    supportsUpdate: false,
  });
};
