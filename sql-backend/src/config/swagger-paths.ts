// API Path Documentation: Registers all endpoint metadata with the OpenAPI registry for SQL Backend.

import { registry } from "@/config/swagger-registry";

const SuccessResponseSchema = {
  properties: {
    data: { type: "object" },
    message: { type: "string" },
    success: { type: "boolean" },
  },
  type: "object",
};

const PaginatedResponseSchema = {
  properties: {
    data: { type: "array" },
    limit: { type: "number" },
    page: { type: "number" },
    success: { type: "boolean" },
    total: { type: "number" },
  },
  type: "object",
};

// --- Authentication ---
registry.registerPath({
  method: "post",
  path: "/auth/login",
  request: {
    body: {
      content: {
        "application/json": {
          schema: {
            properties: {
              companyDB: { type: "string" },
              password: { type: "string" },
              username: { type: "string" },
            },
            required: ["username", "password", "companyDB"],
            type: "object",
          },
        },
      },
    },
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
  security: [{ SessionCookie: [] }],
  summary: "Get Current User",
  tags: ["Authentication"],
});

registry.registerPath({
  method: "post",
  path: "/auth/logout",
  responses: {
    200: {
      content: { "application/json": { schema: SuccessResponseSchema } },
      description: "Success",
    },
  },
  security: [{ SessionCookie: [] }],
  summary: "User Logout",
  tags: ["Authentication"],
});

// --- Purchase Orders ---
registry.registerPath({
  method: "get",
  path: "/purchase-orders",
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

// --- GRPO ---
registry.registerPath({
  method: "get",
  path: "/grpos",
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

// --- AP Invoices ---
registry.registerPath({
  method: "get",
  path: "/ap-invoices",
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

// --- AR Invoices ---
registry.registerPath({
  method: "get",
  path: "/ar-invoices",
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

// --- Sales Orders ---
registry.registerPath({
  method: "get",
  path: "/sales-orders",
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

// --- Dashboard ---
registry.registerPath({
  method: "get",
  path: "/dashboard/stats",
  responses: {
    200: {
      content: { "application/json": { schema: SuccessResponseSchema } },
      description: "Success",
    },
  },
  security: [{ SessionCookie: [] }],
  summary: "Dashboard Stats",
  tags: ["Dashboard"],
});

// --- Organizations ---
registry.registerPath({
  method: "get",
  path: "/organizations",
  responses: {
    200: {
      content: { "application/json": { schema: SuccessResponseSchema } },
      description: "Success",
    },
  },
  summary: "List Organizations",
  tags: ["Organizations"],
});

// --- Master Data ---
registry.registerPath({
  method: "get",
  path: "/master-data/products",
  responses: {
    200: {
      content: { "application/json": { schema: PaginatedResponseSchema } },
      description: "Success",
    },
  },
  security: [{ SessionCookie: [] }],
  summary: "List Products",
  tags: ["Master Data"],
});

registry.registerPath({
  method: "get",
  path: "/master-data/vendors",
  responses: {
    200: {
      content: { "application/json": { schema: PaginatedResponseSchema } },
      description: "Success",
    },
  },
  security: [{ SessionCookie: [] }],
  summary: "List Vendors",
  tags: ["Master Data"],
});

registry.registerPath({
  method: "get",
  path: "/master-data/customers",
  responses: {
    200: {
      content: { "application/json": { schema: PaginatedResponseSchema } },
      description: "Success",
    },
  },
  security: [{ SessionCookie: [] }],
  summary: "List Customers",
  tags: ["Master Data"],
});
