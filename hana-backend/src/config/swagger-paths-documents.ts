// Registers OpenAPI paths for all document modules (matches Express mounts).

import { CreateGRPOInputSchema, UpdateGRPOInputSchema } from "@/modules/grpo/grpo.schema";
import {
  CreatePurchaseOrderInputSchema,
  UpdatePurchaseOrderInputSchema,
} from "@/modules/purchase-order/purchase-order.schema";
import {
  CreatePurchaseQuotationInputSchema,
  UpdatePurchaseQuotationInputSchema,
} from "@/modules/purchase-quotation/purchase-quotation.schema";
import {
  CreateSalesQuotationInputSchema,
  UpdateSalesQuotationInputSchema,
} from "@/modules/sales-quotation/sales-quotation.schema";
import {
  CreateCreditNoteInputSchema,
  UpdateCreditNoteInputSchema,
} from "@/validation/schemas/inputs/credit-note.input";
import {
  CreateInvoiceInputSchema,
  UpdateInvoiceInputSchema,
} from "@/validation/schemas/inputs/invoice.input";
import { CreatePaymentInputSchema } from "@/validation/schemas/inputs/payments.input";

import { registerDocumentPaths } from "./swagger-document-path-register";

export type { DocumentPathOptions } from "./swagger-document-path-register";
export { registerDocumentPaths } from "./swagger-document-path-register";

export const registerAllDocumentModulePaths = () => {
  registerDocumentPaths({
    entityPath: "purchase-orders",
    entityLabel: "Purchase order",
    createSchema: CreatePurchaseOrderInputSchema,
    updateSchema: UpdatePurchaseOrderInputSchema,
    schemaNames: {
      create: "CreatePurchaseOrderInput",
      update: "UpdatePurchaseOrderInput",
    },
  });
  registerDocumentPaths({
    entityPath: "purchase-quotations",
    entityLabel: "Purchase quotation",
    createSchema: CreatePurchaseQuotationInputSchema,
    updateSchema: UpdatePurchaseQuotationInputSchema,
    schemaNames: {
      create: "CreatePurchaseQuotationInput",
      update: "UpdatePurchaseQuotationInput",
    },
  });
  registerDocumentPaths({
    entityPath: "grpos",
    entityLabel: "GRPO",
    createSchema: CreateGRPOInputSchema,
    updateSchema: UpdateGRPOInputSchema,
    schemaNames: { create: "CreateGRPOInput", update: "UpdateGRPOInput" },
  });
  registerDocumentPaths({
    entityPath: "ap-invoices",
    entityLabel: "AP Invoice",
    createSchema: CreateInvoiceInputSchema,
    updateSchema: UpdateInvoiceInputSchema,
    schemaNames: { create: "CreateApInvoiceInput", update: "UpdateApInvoiceInput" },
  });
  registerDocumentPaths({
    entityPath: "ap-credit-memos",
    entityLabel: "AP Credit memo",
    createSchema: CreateCreditNoteInputSchema,
    updateSchema: UpdateCreditNoteInputSchema,
    schemaNames: {
      create: "CreateApCreditMemoInput",
      update: "UpdateApCreditMemoInput",
    },
  });
  registerDocumentPaths({
    entityPath: "sales-quotations",
    entityLabel: "Sales quotation",
    createSchema: CreateSalesQuotationInputSchema,
    updateSchema: UpdateSalesQuotationInputSchema,
    schemaNames: {
      create: "CreateSalesQuotationInput",
      update: "UpdateSalesQuotationInput",
    },
  });
  registerDocumentPaths({
    entityPath: "ar-invoices",
    entityLabel: "AR Invoice",
    createSchema: CreateInvoiceInputSchema,
    updateSchema: UpdateInvoiceInputSchema,
    schemaNames: { create: "CreateArInvoiceInput", update: "UpdateArInvoiceInput" },
  });
  registerDocumentPaths({
    entityPath: "ar-credit-memos",
    entityLabel: "AR Credit memo",
    createSchema: CreateCreditNoteInputSchema,
    updateSchema: UpdateCreditNoteInputSchema,
    schemaNames: {
      create: "CreateArCreditMemoInput",
      update: "UpdateArCreditMemoInput",
    },
  });
  registerDocumentPaths({
    entityPath: "incoming-payments",
    entityLabel: "Incoming payment",
    supportsCancel: true,
    supportsUpdate: true,
    createSchema: CreatePaymentInputSchema,
    schemaNames: { create: "CreateIncomingPaymentInput" },
  });
  registerDocumentPaths({
    entityPath: "outgoing-payments",
    entityLabel: "Outgoing payment",
    supportsCancel: true,
    supportsUpdate: true,
    createSchema: CreatePaymentInputSchema,
    schemaNames: { create: "CreateOutgoingPaymentInput" },
  });
};
