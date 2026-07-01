// Swagger path definitions: Registers all API endpoints for OpenAPI documentation.

import { registerPath } from "./swagger-registry";

export const registerAllPaths = () => {
  // Auth
  registerPath("/auth/login", "post", {
    summary: "Login",
    request: { body: { content: { "application/json": { schema: { type: "object" } } } } },
    responses: {
      "200": { description: "Login successful" },
      "401": { description: "Invalid credentials" },
    },
  });

  registerPath("/auth/me", "get", {
    summary: "Get current user",
    responses: { "200": { description: "Current user data" } },
  });

  registerPath("/auth/logout", "post", {
    summary: "Logout",
    responses: { "200": { description: "Logged out" } },
  });

  // Master Data
  registerPath("/master-data/vendors", "get", {
    summary: "List vendors",
    responses: { "200": { description: "Vendor list" } },
  });
  registerPath("/master-data/customers", "get", {
    summary: "List customers",
    responses: { "200": { description: "Customer list" } },
  });
  registerPath("/master-data/products", "get", {
    summary: "List products",
    responses: { "200": { description: "Product list" } },
  });
  registerPath("/master-data/tax-codes", "get", {
    summary: "List tax codes",
    responses: { "200": { description: "Tax codes" } },
  });
  registerPath("/master-data/uoms", "get", {
    summary: "List UOMs",
    responses: { "200": { description: "UOM list" } },
  });
  registerPath("/master-data/price-lists", "get", {
    summary: "List price lists",
    responses: { "200": { description: "Price lists" } },
  });
  registerPath("/master-data/warehouses", "get", {
    summary: "List warehouses",
    responses: { "200": { description: "Warehouse list" } },
  });
  registerPath("/master-data/sales-employees", "get", {
    summary: "List sales employees",
    responses: { "200": { description: "Employee list" } },
  });
  registerPath("/master-data/chart-of-accounts", "get", {
    summary: "List chart of accounts",
    responses: { "200": { description: "COA list" } },
  });

  // Purchase Orders
  registerPath("/purchase-orders", "get", {
    summary: "List purchase orders",
    responses: { "200": { description: "Paginated PO list" } },
  });
  registerPath("/purchase-orders", "post", {
    summary: "Create purchase order",
    responses: { "201": { description: "PO created" } },
  });
  registerPath("/purchase-orders/{id}", "get", {
    summary: "Get purchase order by ID",
    responses: { "200": { description: "PO data" } },
  });
  registerPath("/purchase-orders/{id}", "patch", {
    summary: "Update purchase order",
    responses: { "200": { description: "PO updated" } },
  });
  registerPath("/purchase-orders/{id}/cancel", "post", {
    summary: "Cancel purchase order",
    responses: { "200": { description: "PO cancelled" } },
  });
  registerPath("/purchase-orders/doc-nums", "get", {
    summary: "PO doc number lookup",
    responses: { "200": { description: "Doc numbers" } },
  });

  // Dashboard
  registerPath("/dashboard/summary", "get", {
    summary: "Dashboard summary",
    responses: { "200": { description: "Dashboard data" } },
  });
  registerPath("/dashboard/purchase", "get", {
    summary: "Purchase dashboard",
    responses: { "200": { description: "Purchase KPIs" } },
  });
  registerPath("/dashboard/sales", "get", {
    summary: "Sales dashboard",
    responses: { "200": { description: "Sales KPIs" } },
  });
  registerPath("/dashboard/inventory", "get", {
    summary: "Inventory dashboard",
    responses: { "200": { description: "Inventory KPIs" } },
  });
};
