// Swagger path definitions: Registers all API endpoints for OpenAPI documentation.

import { registerPath } from "./swagger-registry";

const registerDocumentPaths = (
  entityPath: string,
  entityLabel: string,
  supportsCancel = true,
  supportsUpdate = true,
) => {
  registerPath(`/${entityPath}`, "get", {
    summary: `List ${entityLabel}s`,
    description: `Retrieves a paginated list of ${entityLabel} documents with filtering and sorting support.`,
    responses: { "200": { description: `Paginated ${entityLabel} list` } },
  });
  registerPath(`/${entityPath}`, "post", {
    summary: `Create ${entityLabel}`,
    description: `Creates a new ${entityLabel} document.`,
    responses: { "201": { description: `${entityLabel} created` } },
  });
  registerPath(`/${entityPath}/{id}`, "get", {
    summary: `Get ${entityLabel} by ID`,
    description: `Retrieves detailed information for a specific ${entityLabel} by its unique ID.`,
    responses: { "200": { description: `${entityLabel} details` } },
  });
  if (supportsUpdate) {
    registerPath(`/${entityPath}/{id}`, "patch", {
      summary: `Update ${entityLabel}`,
      description: `Updates comments or fields of an existing ${entityLabel} document.`,
      responses: { "200": { description: `${entityLabel} updated` } },
    });
  }
  if (supportsCancel) {
    registerPath(`/${entityPath}/{id}/cancel`, "post", {
      summary: `Cancel ${entityLabel}`,
      description: `Cancels/closes an active ${entityLabel} document.`,
      responses: { "200": { description: `${entityLabel} cancelled` } },
    });
  }
  registerPath(`/${entityPath}/doc-nums`, "get", {
    summary: `${entityLabel} doc number lookup`,
    description: `Searches and retrieves document numbers for ${entityLabel} auto-suggest search fields.`,
    responses: { "200": { description: "Doc numbers list" } },
  });
};

export const registerAllPaths = () => {
  // Auth
  registerPath("/auth/login", "post", {
    summary: "Login",
    description: "Authenticates credentials and establishes a user session cookie.",
    request: { body: { content: { "application/json": { schema: { type: "object" } } } } },
    responses: {
      "200": { description: "Login successful" },
      "401": { description: "Invalid credentials" },
    },
  });

  registerPath("/auth/me", "get", {
    summary: "Get current user",
    description: "Returns metadata for the currently authenticated session.",
    responses: { "200": { description: "Current user data" } },
  });

  registerPath("/auth/logout", "post", {
    summary: "Logout",
    description: "Destroys the current user session and clears authentication cookies.",
    responses: { "200": { description: "Logged out" } },
  });

  // Master Data
  registerPath("/master-data/vendors", "get", {
    summary: "List vendors",
    description: "Retrieves business partners filtered by supplier type.",
    responses: { "200": { description: "Vendor list" } },
  });
  registerPath("/master-data/customers", "get", {
    summary: "List customers",
    description: "Retrieves business partners filtered by customer type.",
    responses: { "200": { description: "Customer list" } },
  });
  registerPath("/master-data/products", "get", {
    summary: "List products",
    description: "Retrieves active catalog products.",
    responses: { "200": { description: "Product list" } },
  });
  registerPath("/master-data/tax-codes", "get", {
    summary: "List tax codes",
    description: "Retrieves configured tax categories.",
    responses: { "200": { description: "Tax codes" } },
  });
  registerPath("/master-data/uoms", "get", {
    summary: "List UOMs",
    description: "Retrieves units of measurement.",
    responses: { "200": { description: "UOM list" } },
  });
  registerPath("/master-data/price-lists", "get", {
    summary: "List price lists",
    description: "Retrieves active base price catalogs.",
    responses: { "200": { description: "Price lists" } },
  });
  registerPath("/master-data/warehouses", "get", {
    summary: "List warehouses",
    description: "Retrieves active storage warehouses.",
    responses: { "200": { description: "Warehouse list" } },
  });
  registerPath("/master-data/sales-employees", "get", {
    summary: "List sales employees",
    description: "Retrieves active representatives list.",
    responses: { "200": { description: "Employee list" } },
  });
  registerPath("/master-data/chart-of-accounts", "get", {
    summary: "List chart of accounts",
    description: "Retrieves active finance chart accounts.",
    responses: { "200": { description: "COA list" } },
  });

  // Reusable Document Modules Paths
  registerDocumentPaths("purchase-orders", "Purchase order");
  registerDocumentPaths("purchase-quotations", "Purchase quotation");
  registerDocumentPaths("grpos", "GRPO");
  registerDocumentPaths("ap-invoices", "AP Invoice");
  registerDocumentPaths("ap-credit-memos", "AP Credit memo");
  registerDocumentPaths("sales-orders", "Sales order");
  registerDocumentPaths("sales-quotations", "Sales quotation");
  registerDocumentPaths("ar-invoices", "AR Invoice");
  registerDocumentPaths("ar-credit-memos", "AR Credit memo");

  registerDocumentPaths("goods-receipts", "Goods receipt", false, true);
  registerDocumentPaths("goods-issues", "Goods issue", false, true);

  registerDocumentPaths("inventory-transfers", "Inventory transfer", false, false);
  registerDocumentPaths("transfers", "Inventory transfer alternative", false, false);

  registerDocumentPaths("inventory-transfer-requests", "Inventory transfer request");
  registerDocumentPaths("transfer-requests", "Inventory transfer request alternative");

  registerDocumentPaths("incoming-payments", "Incoming payment", true, false);
  registerDocumentPaths("outgoing-payments", "Outgoing payment", true, false);

  // Items / Catalog
  registerPath("/items", "get", {
    summary: "List catalog items",
    description: "Retrieves items list.",
    responses: { "200": { description: "Items list" } },
  });
  registerPath("/items/{id}", "get", {
    summary: "Get catalog item by ID/Code",
    description: "Retrieves a catalog item by its Code/ID.",
    responses: { "200": { description: "Item details" } },
  });
  registerPath("/items/doc-nums", "get", {
    summary: "Catalog items code lookup",
    description: "Suggests item codes for input autocomplete fields.",
    responses: { "200": { description: "Item codes" } },
  });

  // Bank Details
  registerPath("/bank-details", "get", {
    summary: "List bank details",
    description: "Retrieves a list of registered bank details.",
    responses: { "200": { description: "Bank details list" } },
  });
  registerPath("/bank-details", "post", {
    summary: "Create bank details",
    description: "Creates a new bank details record.",
    responses: { "201": { description: "Bank details created" } },
  });
  registerPath("/bank-details/{id}", "get", {
    summary: "Get bank details by ID",
    description: "Retrieves a bank details record by ID.",
    responses: { "200": { description: "Bank details data" } },
  });

  // Relationship Map
  registerPath("/relationship-map", "get", {
    summary: "Get relationship map",
    description: "Builds a document connection graph showing preceding and succeeding references.",
    responses: { "200": { description: "Document relationship map data" } },
  });

  // Attachments
  registerPath("/attachments", "post", {
    summary: "Upload attachment",
    description: "Uploads a new file attachment to the system storage.",
    responses: { "201": { description: "Attachment uploaded" } },
  });
  registerPath("/attachments/{id}", "get", {
    summary: "Download attachment",
    description: "Retrieves the binary content of a file attachment by its ID.",
    responses: { "200": { description: "Attachment binary data" } },
  });
  registerPath("/attachments/{id}", "delete", {
    summary: "Delete attachment",
    description: "Removes an attachment reference and deletes its stored file.",
    responses: { "200": { description: "Attachment deleted" } },
  });

  // Dashboard
  registerPath("/dashboard/summary", "get", {
    summary: "Dashboard summary",
    description: "Returns aggregated numbers and metrics for the main screen dashboard.",
    responses: { "200": { description: "Dashboard data" } },
  });
  registerPath("/dashboard/purchase", "get", {
    summary: "Purchase dashboard",
    description: "Returns procurement metrics and charts datasets.",
    responses: { "200": { description: "Purchase KPIs" } },
  });
  registerPath("/dashboard/sales", "get", {
    summary: "Sales dashboard",
    description: "Returns sales metrics and O2C graph datasets.",
    responses: { "200": { description: "Sales KPIs" } },
  });
  registerPath("/dashboard/inventory", "get", {
    summary: "Inventory dashboard",
    description: "Returns inventory items and stock value counts.",
    responses: { "200": { description: "Inventory KPIs" } },
  });
};
