// Full API surface (mirrors Express mounts under /api/v1).

import { cookieSecurity, jsonResponses, registerPath } from "@/config/swagger-registry";
import { registerAllDocumentModulePaths } from "@/config/swagger-paths-documents";
import { LoginInputSchema } from "@/modules/auth/auth.schema";

export const registerAllPaths = () => {
  // --- Auth ---
  registerPath("/auth/login", "post", {
    security: [],
    operationId: "login",
    summary: "Login",
    description: "Authenticates credentials and establishes a user session cookie.",
    tags: ["Authentication"],
    request: {
      body: {
        required: true,
        content: { "application/json": { schema: LoginInputSchema } },
      },
    },
    responses: jsonResponses({
      successDescription: "Login successful; session cookie set.",
      publicRoute: true,
    }),
  });
  registerPath("/auth/me", "get", {
    security: cookieSecurity,
    operationId: "getCurrentUser",
    summary: "Get current user",
    description: "Returns metadata for the currently authenticated session.",
    tags: ["Authentication"],
    responses: jsonResponses({
      successDescription: "Current user data.",
      includeValidationError: false,
    }),
  });
  registerPath("/auth/logout", "post", {
    security: cookieSecurity,
    operationId: "logout",
    summary: "Logout",
    description: "Destroys the current user session and clears authentication cookies.",
    tags: ["Authentication"],
    responses: jsonResponses({
      successDescription: "Logged out.",
      includeValidationError: false,
    }),
  });

  // --- Master data ---
  const master: Array<[string, string, string]> = [
    ["vendors", "listVendors", "Business partners filtered by supplier type."],
    ["customers", "listCustomers", "Business partners filtered by customer type."],
    ["products", "listProducts", "Active catalog products."],
    ["tax-codes", "listTaxCodes", "Configured tax categories."],
    ["uoms", "listUoms", "Units of measurement."],
    ["price-lists", "listPriceLists", "Active base price catalogs."],
    ["warehouses", "listWarehouses", "Active storage warehouses."],
    ["sales-employees", "listSalesEmployees", "Active sales representatives."],
    ["chart-of-accounts", "listChartOfAccounts", "Active finance chart accounts."],
  ];
  for (const [segment, operationId, description] of master) {
    registerPath(`/master-data/${segment}`, "get", {
      security: cookieSecurity,
      operationId,
      summary: description,
      description,
      tags: ["Master Data"],
      responses: jsonResponses({ successDescription: description }),
    });
  }

  // --- Document modules ---
  registerAllDocumentModulePaths();

  // --- Items ---
  registerPath("/items", "get", {
    security: cookieSecurity,
    operationId: "listItems",
    summary: "List catalog items",
    description: "Retrieves items list.",
    tags: ["Items"],
    responses: jsonResponses({
      successDescription: "Items list.",
      successSchema: "PaginatedResponse",
    }),
  });
  registerPath("/items/{id}", "get", {
    security: cookieSecurity,
    operationId: "getItemById",
    summary: "Get catalog item by ID/Code",
    description: "Retrieves a catalog item by its Code/ID.",
    tags: ["Items"],
    responses: jsonResponses({
      successDescription: "Item details.",
      includeNotFound: true,
    }),
  });
  // Matches Express: /docnums (not /doc-nums)
  registerPath("/items/docnums", "get", {
    security: cookieSecurity,
    operationId: "listItemCodes",
    summary: "Catalog items code lookup",
    description: "Suggests item codes for input autocomplete fields.",
    tags: ["Items"],
    responses: jsonResponses({ successDescription: "Item codes." }),
  });

  // --- Bank details ---
  registerPath("/bank-details", "get", {
    security: cookieSecurity,
    operationId: "listBankDetails",
    summary: "List bank details",
    description: "Retrieves registered bank details.",
    tags: ["Bank Details"],
    responses: jsonResponses({ successDescription: "Bank details list." }),
  });
  registerPath("/bank-details", "post", {
    security: cookieSecurity,
    operationId: "createBankDetails",
    summary: "Create bank details",
    description: "Creates a new bank details record.",
    tags: ["Bank Details"],
    responses: jsonResponses({
      successStatus: "201",
      successDescription: "Bank details created.",
    }),
  });
  registerPath("/bank-details/{id}", "get", {
    security: cookieSecurity,
    operationId: "getBankDetailsById",
    summary: "Get bank details by ID",
    description: "Retrieves a bank details record by ID.",
    tags: ["Bank Details"],
    responses: jsonResponses({
      successDescription: "Bank details data.",
      includeNotFound: true,
    }),
  });

  // --- Relationship map ---
  registerPath("/relationship-map", "get", {
    security: cookieSecurity,
    operationId: "getRelationshipMap",
    summary: "Get relationship map",
    description: "Document connection graph (preceding and succeeding references).",
    tags: ["Relationship Map"],
    responses: jsonResponses({ successDescription: "Relationship map data." }),
  });

  // --- Attachments ---
  registerPath("/attachments", "post", {
    security: cookieSecurity,
    operationId: "uploadAttachment",
    summary: "Upload attachment",
    description: "Uploads a file attachment to system storage.",
    tags: ["Attachments"],
    responses: jsonResponses({
      successStatus: "201",
      successDescription: "Attachment uploaded.",
    }),
  });
  registerPath("/attachments/{id}", "get", {
    security: cookieSecurity,
    operationId: "downloadAttachment",
    summary: "Download attachment",
    description: "Retrieves binary content of a file attachment by ID.",
    tags: ["Attachments"],
    responses: jsonResponses({
      successDescription: "Attachment binary data.",
      includeNotFound: true,
    }),
  });
  registerPath("/attachments/{id}", "delete", {
    security: cookieSecurity,
    operationId: "deleteAttachment",
    summary: "Delete attachment",
    description: "Removes an attachment reference and stored file.",
    tags: ["Attachments"],
    responses: jsonResponses({
      successDescription: "Attachment deleted.",
      includeNotFound: true,
    }),
  });

  // --- Dashboard ---
  registerPath("/dashboard/summary", "get", {
    security: cookieSecurity,
    operationId: "getDashboardSummary",
    summary: "Dashboard summary",
    description: "Aggregated numbers and metrics for the main dashboard.",
    tags: ["Dashboard"],
    responses: jsonResponses({ successDescription: "Dashboard data." }),
  });
  registerPath("/dashboard/purchase", "get", {
    security: cookieSecurity,
    operationId: "getPurchaseDashboard",
    summary: "Purchase dashboard",
    description: "Procurement metrics and chart datasets.",
    tags: ["Dashboard"],
    responses: jsonResponses({ successDescription: "Purchase KPIs." }),
  });
  registerPath("/dashboard/sales", "get", {
    security: cookieSecurity,
    operationId: "getSalesDashboard",
    summary: "Sales dashboard",
    description: "Sales metrics and O2C graph datasets.",
    tags: ["Dashboard"],
    responses: jsonResponses({ successDescription: "Sales KPIs." }),
  });
  registerPath("/dashboard/inventory", "get", {
    security: cookieSecurity,
    operationId: "getInventoryDashboard",
    summary: "Inventory dashboard",
    description: "Inventory items and stock value counts.",
    tags: ["Dashboard"],
    responses: jsonResponses({ successDescription: "Inventory KPIs." }),
  });

  // --- Health ---
  registerPath("/health", "get", {
    security: [],
    operationId: "healthCheck",
    summary: "Health check",
    description: "Liveness probe for load balancers and monitoring.",
    tags: ["Health"],
    responses: jsonResponses({
      successDescription: "Service is up.",
      publicRoute: true,
      includeValidationError: false,
    }),
  });
};
