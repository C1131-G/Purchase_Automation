// API Path Documentation: Registers all endpoint metadata (methods, paths, tags, and schemas) with the OpenAPI registry.

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
  request: {
    body: { content: { "application/json": { schema: LoginInputSchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessResponseSchema } },
      description: "Success",
    },
  },
  summary: "User Login",
  tags: ["Authentication"],
});

registry.registerPath({
  method: "get",
  path: "/auth/me",
  responses: {
    200: {
      content: { "application/json": { schema: SuccessResponseSchema } },
      description: "Success",
    },
  },
  security: [{ SessionCookie: [] }], // Requires an active session cookie.
  summary: "Get Current User",
  tags: ["Authentication"],
});

// --- Purchase Orders: Procurement document management ---

registry.registerPath({
  method: "get",
  path: "/PurchaseOrders",
  request: { query: PurchaseOrderQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: PaginatedResponseSchema } },
      description: "Success",
    },
  },
  security: [{ SessionCookie: [] }],
  summary: "List Purchase Orders",
  tags: ["Purchase Orders"],
});

registry.registerPath({
  method: "post",
  path: "/PurchaseOrders",
  request: {
    body: {
      content: {
        "application/json": { schema: CreatePurchaseOrderInputSchema },
      },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: SuccessResponseSchema } },
      description: "Created",
    },
  },
  security: [{ SessionCookie: [] }],
  summary: "Create Purchase Order",
  tags: ["Purchase Orders"],
});

// --- GRPO (Goods Receipt PO): Shipment reception tracking ---

registry.registerPath({
  method: "get",
  path: "/GRPO",
  request: { query: GRPOQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: PaginatedResponseSchema } },
      description: "Success",
    },
  },
  security: [{ SessionCookie: [] }],
  summary: "List GRPOs",
  tags: ["Goods Receipt PO"],
});

registry.registerPath({
  method: "post",
  path: "/GRPO",
  request: {
    body: {
      content: { "application/json": { schema: CreateGRPOInputSchema } },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: SuccessResponseSchema } },
      description: "Created",
    },
  },
  security: [{ SessionCookie: [] }],
  summary: "Create GRPO",
  tags: ["Goods Receipt PO"],
});

// --- Invoices: Billing and receivable documents ---

registry.registerPath({
  method: "get",
  path: "/APInvoice",
  request: { query: InvoiceQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: PaginatedResponseSchema } },
      description: "Success",
    },
  },
  security: [{ SessionCookie: [] }],
  summary: "List A/P Invoices",
  tags: ["Invoices"],
});

registry.registerPath({
  method: "get",
  path: "/ARInvoice",
  request: { query: InvoiceQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: PaginatedResponseSchema } },
      description: "Success",
    },
  },
  security: [{ SessionCookie: [] }],
  summary: "List A/R Invoices",
  tags: ["Invoices"],
});

registry.registerPath({
  method: "post",
  path: "/APInvoice",
  request: {
    body: {
      content: { "application/json": { schema: CreateInvoiceInputSchema } },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: SuccessResponseSchema } },
      description: "Created",
    },
  },
  security: [{ SessionCookie: [] }],
  summary: "Create A/P Invoice",
  tags: ["Invoices"],
});

registry.registerPath({
  method: "post",
  path: "/ARInvoice",
  request: {
    body: {
      content: { "application/json": { schema: CreateInvoiceInputSchema } },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: SuccessResponseSchema } },
      description: "Created",
    },
  },
  security: [{ SessionCookie: [] }],
  summary: "Create A/R Invoice",
  tags: ["Invoices"],
});

// --- Credit Notes: Document reversals and credits ---

registry.registerPath({
  method: "get",
  path: "/APCreditMemo",
  request: { query: CreditNoteQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: PaginatedResponseSchema } },
      description: "Success",
    },
  },
  security: [{ SessionCookie: [] }],
  summary: "List A/P Credit Memos",
  tags: ["Credit Memos"],
});

registry.registerPath({
  method: "get",
  path: "/ARCreditMemo",
  request: { query: CreditNoteQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: PaginatedResponseSchema } },
      description: "Success",
    },
  },
  security: [{ SessionCookie: [] }],
  summary: "List A/R Credit Memos",
  tags: ["Credit Notes"],
});

// --- Payments: Cash and transfer transactions ---

registry.registerPath({
  method: "get",
  path: "/IncomingPayment",
  request: { query: PaymentQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: PaginatedResponseSchema } },
      description: "Success",
    },
  },
  security: [{ SessionCookie: [] }],
  summary: "List Incoming Payments",
  tags: ["Payments"],
});

registry.registerPath({
  method: "get",
  path: "/OutgoingPayment",
  request: { query: PaymentQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: PaginatedResponseSchema } },
      description: "Success",
    },
  },
  security: [{ SessionCookie: [] }],
  summary: "List Outgoing Payments",
  tags: ["Payments"],
});

// --- Sales Orders: Customer demand document management ---

registry.registerPath({
  method: "get",
  path: "/SalesOrders",
  request: { query: SalesOrderQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: PaginatedResponseSchema } },
      description: "Success",
    },
  },
  security: [{ SessionCookie: [] }],
  summary: "List Sales Orders",
  tags: ["Sales Orders"],
});

registry.registerPath({
  method: "post",
  path: "/SalesOrders",
  request: {
    body: {
      content: { "application/json": { schema: CreateSalesOrderInputSchema } },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: SuccessResponseSchema } },
      description: "Created",
    },
  },
  security: [{ SessionCookie: [] }],
  summary: "Create Sales Order",
  tags: ["Sales Orders"],
});

// --- Dashboard & Organizations: Global views and multi-tenancy ---

registry.registerPath({
  method: "get",
  path: "/dashboard/purchase-summary",
  request: { query: DashboardSummaryQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessResponseSchema } },
      description: "Success",
    },
  },
  security: [{ SessionCookie: [] }],
  summary: "Purchase Summary",
  tags: ["Dashboard"],
});

registry.registerPath({
  method: "get",
  path: "/organizations",
  request: { query: OrganizationQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessResponseSchema } },
      description: "Success",
    },
  },
  summary: "List Organizations",
  tags: ["Organizations"],
});

// --- Master Data: Reference lists for items and business partners ---

registry.registerPath({
  method: "get",
  path: "/master/products",
  request: { query: MasterDataQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessResponseSchema } },
      description: "Success",
    },
  },
  security: [{ SessionCookie: [] }],
  summary: "List Products",
  tags: ["Master Data"],
});
