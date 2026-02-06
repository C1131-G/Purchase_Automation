// API Path Documentation: Registers all endpoint metadata (methods, paths, tags, and schemas) with the OpenAPI registry.

import { z } from "zod";

import { registry } from "@/config/swagger-registry";
import { LoginInputSchema } from "@/validation/schemas/inputs/auth.input";
import { CreditNoteQuerySchema } from "@/validation/schemas/inputs/credit-note.input";
import { DashboardSummaryQuerySchema } from "@/validation/schemas/inputs/dashboard.input";
import { CreateGRPOInputSchema, GRPOQuerySchema } from "@/validation/schemas/inputs/grpo.input";
import {
  CreateInvoiceInputSchema,
  InvoiceQuerySchema,
} from "@/validation/schemas/inputs/invoice.input";
import { MasterDataQuerySchema } from "@/validation/schemas/inputs/master-data.input";
import { OrganizationQuerySchema } from "@/validation/schemas/inputs/organization.input";
import { PaymentQuerySchema } from "@/validation/schemas/inputs/payments.input";
import {
  CreatePurchaseOrderInputSchema,
  PurchaseOrderQuerySchema,
} from "@/validation/schemas/inputs/purchase-order.input";
import {
  CreateSalesOrderInputSchema,
  SalesOrderQuerySchema,
} from "@/validation/schemas/inputs/sales-order.input";
import {
  PaginatedResponseSchema,
  SuccessResponseSchema,
} from "@/validation/schemas/outputs/common.output";

// --- Authentication: Endpoints for session lifecycle and identity verification ---

registry.registerPath({
  method: "post",
  path: "/auth/login",
  summary: "User Login",
  tags: ["Authentication"],
  request: { body: { content: { "application/json": { schema: LoginInputSchema } } } },
  responses: {
    200: {
      description: "Success",
      content: { "application/json": { schema: SuccessResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/auth/me",
  summary: "Get Current User",
  tags: ["Authentication"],
  security: [{ SessionCookie: [] }], // Requires an active session cookie.
  responses: {
    200: {
      description: "Success",
      content: { "application/json": { schema: SuccessResponseSchema } },
    },
  },
});

// --- Purchase Orders: Procurement document management ---

registry.registerPath({
  method: "get",
  path: "/PurchaseOrders",
  summary: "List Purchase Orders",
  tags: ["Purchase Orders"],
  security: [{ SessionCookie: [] }],
  request: { query: PurchaseOrderQuerySchema },
  responses: {
    200: {
      description: "Success",
      content: { "application/json": { schema: PaginatedResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/PurchaseOrders",
  summary: "Create Purchase Order",
  tags: ["Purchase Orders"],
  security: [{ SessionCookie: [] }],
  request: {
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({
            Payload: CreatePurchaseOrderInputSchema, // JSON data part.
            Attachment: z.string().openapi({ type: "string", format: "binary" }).optional(), // File upload part.
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: "Created",
      content: { "application/json": { schema: SuccessResponseSchema } },
    },
  },
});

// --- GRPO (Goods Receipt PO): Shipment reception tracking ---

registry.registerPath({
  method: "get",
  path: "/GRPO",
  summary: "List GRPOs",
  tags: ["Goods Receipt PO"],
  security: [{ SessionCookie: [] }],
  request: { query: GRPOQuerySchema },
  responses: {
    200: {
      description: "Success",
      content: { "application/json": { schema: PaginatedResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/GRPO",
  summary: "Create GRPO",
  tags: ["Goods Receipt PO"],
  security: [{ SessionCookie: [] }],
  request: {
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({
            Payload: CreateGRPOInputSchema,
            Attachment: z.string().openapi({ type: "string", format: "binary" }).optional(),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: "Created",
      content: { "application/json": { schema: SuccessResponseSchema } },
    },
  },
});

// --- Invoices: Billing and receivable documents ---

registry.registerPath({
  method: "get",
  path: "/APInvoice",
  summary: "List A/P Invoices",
  tags: ["Invoices"],
  security: [{ SessionCookie: [] }],
  request: { query: InvoiceQuerySchema },
  responses: {
    200: {
      description: "Success",
      content: { "application/json": { schema: PaginatedResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/ARInvoice",
  summary: "List A/R Invoices",
  tags: ["Invoices"],
  security: [{ SessionCookie: [] }],
  request: { query: InvoiceQuerySchema },
  responses: {
    200: {
      description: "Success",
      content: { "application/json": { schema: PaginatedResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/APInvoice",
  summary: "Create A/P Invoice",
  tags: ["Invoices"],
  security: [{ SessionCookie: [] }],
  request: {
    body: {
      content: {
        "multipart/form-data": { schema: z.object({ Payload: CreateInvoiceInputSchema }) },
      },
    },
  },
  responses: {
    201: {
      description: "Created",
      content: { "application/json": { schema: SuccessResponseSchema } },
    },
  },
});

// --- Credit Notes: Document reversals and credits ---

registry.registerPath({
  method: "get",
  path: "/APCreditNote",
  summary: "List A/P Credit Notes",
  tags: ["Credit Notes"],
  security: [{ SessionCookie: [] }],
  request: { query: CreditNoteQuerySchema },
  responses: {
    200: {
      description: "Success",
      content: { "application/json": { schema: PaginatedResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/ARCreditNote",
  summary: "List A/R Credit Notes",
  tags: ["Credit Notes"],
  security: [{ SessionCookie: [] }],
  request: { query: CreditNoteQuerySchema },
  responses: {
    200: {
      description: "Success",
      content: { "application/json": { schema: PaginatedResponseSchema } },
    },
  },
});

// --- Payments: Cash and transfer transactions ---

registry.registerPath({
  method: "get",
  path: "/IncomingPayment",
  summary: "List Incoming Payments",
  tags: ["Payments"],
  security: [{ SessionCookie: [] }],
  request: { query: PaymentQuerySchema },
  responses: {
    200: {
      description: "Success",
      content: { "application/json": { schema: PaginatedResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/OutgoingPayment",
  summary: "List Outgoing Payments",
  tags: ["Payments"],
  security: [{ SessionCookie: [] }],
  request: { query: PaymentQuerySchema },
  responses: {
    200: {
      description: "Success",
      content: { "application/json": { schema: PaginatedResponseSchema } },
    },
  },
});

// --- Sales Orders: Customer demand document management ---

registry.registerPath({
  method: "get",
  path: "/SalesOrders",
  summary: "List Sales Orders",
  tags: ["Sales Orders"],
  security: [{ SessionCookie: [] }],
  request: { query: SalesOrderQuerySchema },
  responses: {
    200: {
      description: "Success",
      content: { "application/json": { schema: PaginatedResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/SalesOrders",
  summary: "Create Sales Order",
  tags: ["Sales Orders"],
  security: [{ SessionCookie: [] }],
  request: { body: { content: { "application/json": { schema: CreateSalesOrderInputSchema } } } },
  responses: {
    201: {
      description: "Created",
      content: { "application/json": { schema: SuccessResponseSchema } },
    },
  },
});

// --- Dashboard & Organizations: Global views and multi-tenancy ---

registry.registerPath({
  method: "get",
  path: "/dashboard/purchase-summary",
  summary: "Purchase Summary",
  tags: ["Dashboard"],
  security: [{ SessionCookie: [] }],
  request: { query: DashboardSummaryQuerySchema },
  responses: {
    200: {
      description: "Success",
      content: { "application/json": { schema: SuccessResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/organizations",
  summary: "List Organizations",
  tags: ["Organizations"],
  request: { query: OrganizationQuerySchema },
  responses: {
    200: {
      description: "Success",
      content: { "application/json": { schema: SuccessResponseSchema } },
    },
  },
});

// --- Master Data: Reference lists for items and business partners ---

registry.registerPath({
  method: "get",
  path: "/master/products",
  summary: "List Products",
  tags: ["Master Data"],
  security: [{ SessionCookie: [] }],
  request: { query: MasterDataQuerySchema },
  responses: {
    200: {
      description: "Success",
      content: { "application/json": { schema: SuccessResponseSchema } },
    },
  },
});
