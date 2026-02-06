// Swagger Configuration: Orchestrates the generation of the OpenAPI v3 specification.
// It acts as a central registry where all request/response schemas are declared for the docs.

import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";

import { registry } from "@/config/swagger-registry";
import { LoginInputSchema } from "@/validation/schemas/inputs/auth.input";
import {
  CreateCreditNoteInputSchema,
  CreditNoteQuerySchema,
  UpdateCreditNoteInputSchema,
} from "@/validation/schemas/inputs/credit-note.input";
import { DashboardSummaryQuerySchema } from "@/validation/schemas/inputs/dashboard.input";
import {
  CreateGRPOInputSchema,
  GRPOQuerySchema,
  UpdateGRPOInputSchema,
} from "@/validation/schemas/inputs/grpo.input";
import {
  CreateInvoiceInputSchema,
  InvoiceQuerySchema,
  UpdateInvoiceInputSchema,
} from "@/validation/schemas/inputs/invoice.input";
import { MasterDataQuerySchema } from "@/validation/schemas/inputs/master-data.input";
import { OrganizationQuerySchema } from "@/validation/schemas/inputs/organization.input";
import {
  CreatePaymentInputSchema,
  PaymentQuerySchema,
} from "@/validation/schemas/inputs/payments.input";
import {
  CreatePurchaseOrderInputSchema,
  PurchaseOrderQuerySchema,
  UpdatePurchaseOrderInputSchema,
} from "@/validation/schemas/inputs/purchase-order.input";
import {
  CreateSalesOrderInputSchema,
  SalesOrderQuerySchema,
  UpdateSalesOrderInputSchema,
} from "@/validation/schemas/inputs/sales-order.input";
import {
  ErrorResponseSchema,
  PaginatedResponseSchema,
  SuccessResponseSchema,
} from "@/validation/schemas/outputs/common.output";

// Registration Loop: Maps Zod schemas to OpenAPI Component names.
registry.register("LoginInput", LoginInputSchema);
registry.register("SuccessResponse", SuccessResponseSchema);
registry.register("ErrorResponse", ErrorResponseSchema);
registry.register("PaginatedResponse", PaginatedResponseSchema);
registry.register("PurchaseOrderQuery", PurchaseOrderQuerySchema);
registry.register("CreatePurchaseOrderInput", CreatePurchaseOrderInputSchema);
registry.register("UpdatePurchaseOrderInput", UpdatePurchaseOrderInputSchema);
registry.register("GRPOQuery", GRPOQuerySchema);
registry.register("CreateGRPOInput", CreateGRPOInputSchema);
registry.register("UpdateGRPOInput", UpdateGRPOInputSchema);
registry.register("InvoiceQuery", InvoiceQuerySchema);
registry.register("CreateInvoiceInput", CreateInvoiceInputSchema);
registry.register("UpdateInvoiceInput", UpdateInvoiceInputSchema);
registry.register("CreditNoteQuery", CreditNoteQuerySchema);
registry.register("CreateCreditNoteInput", CreateCreditNoteInputSchema);
registry.register("UpdateCreditNoteInput", UpdateCreditNoteInputSchema);
registry.register("PaymentQuery", PaymentQuerySchema);
registry.register("CreatePaymentInput", CreatePaymentInputSchema);
registry.register("SalesOrderQuery", SalesOrderQuerySchema);
registry.register("CreateSalesOrderInput", CreateSalesOrderInputSchema);
registry.register("UpdateSalesOrderInput", UpdateSalesOrderInputSchema);
registry.register("MasterDataQuery", MasterDataQuerySchema);
registry.register("DashboardSummaryQuery", DashboardSummaryQuerySchema);
registry.register("OrganizationsQuery", OrganizationQuerySchema);

// Side Effect: Importing this file triggers the registration of all API endpoints (paths).
import "@/config/swagger-paths";

// generateOpenApiSpec: High-level function called by app.ts to produce the final JSON document.
export const generateOpenApiSpec = () => {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Vendor Portal API",
      version: "1.0.0",
      description: "API Documentation for Vendor Portal Backend",
    },
    servers: [
      {
        url: "/api/v1",
        description: "API Base URL",
      },
    ],
  });
};
