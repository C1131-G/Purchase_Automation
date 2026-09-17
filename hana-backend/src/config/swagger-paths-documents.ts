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
    entityPath: "sales-quotations",
    entityLabel: "Sales quotation",
    createSchema: CreateSalesQuotationInputSchema,
    updateSchema: UpdateSalesQuotationInputSchema,
    schemaNames: {
      create: "CreateSalesQuotationInput",
      update: "UpdateSalesQuotationInput",
    },
  });
};
