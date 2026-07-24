// Full API surface registration (registerAllPaths pattern).

import { cookieSecurity, jsonResponses, registerPath } from "@/config/swagger-registry";
import { registerAllDocumentModulePaths } from "@/config/swagger-paths-documents";
import { LoginInputSchema } from "@/modules/auth/auth.schema";

export const registerAllPaths = () => {
  // --- Auth ---
  registerPath("/auth/login", "post", {
    security: [],
    operationId: "login",
    summary: "Login",
    description: "Authenticates credentials and sets vendorportal.sid session cookie.",
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
    description: "Returns authenticated session user and tenant metadata.",
    tags: ["Authentication"],
    responses: jsonResponses({
      successDescription: "Current user.",
      includeValidationError: false,
    }),
  });
  registerPath("/auth/logout", "post", {
    security: cookieSecurity,
    operationId: "logout",
    summary: "Logout",
    description: "Destroys session, clears cookie, ends SAP SL session when present.",
    tags: ["Authentication"],
    responses: jsonResponses({
      successDescription: "Logged out.",
      includeValidationError: false,
    }),
  });

  // --- Organizations ---
  registerPath("/organizations", "get", {
    security: [],
    operationId: "listOrganizations",
    summary: "List organizations",
    description: "Company databases available for the login company picker.",
    tags: ["Organizations"],
    responses: jsonResponses({
      successDescription: "Organization list.",
      publicRoute: true,
    }),
  });

  // --- Master data ---
  const masterGets: Array<[string, string, string]> = [
    ["vendors", "listVendors", "Business partners of type supplier."],
    ["customers", "listCustomers", "Business partners of type customer."],
    ["products", "listProducts", "Item master with stock/price enrichment."],
    // Real Express path is /TaxDeclarations (legacy SAP naming kept for clients).
    ["TaxDeclarations", "listTaxCodes", "Active tax groups/rates."],
    ["uoms", "listUoms", "Units of measurement."],
    ["price-lists", "listPriceLists", "Price list catalog."],
    ["warehouses", "listWarehouses", "Warehouse master."],
    ["series", "listDocumentSeries", "Document numbering series."],
    ["branches", "listBranches", "Branches / distribution rules."],
  ];
  for (const [segment, operationId, description] of masterGets) {
    registerPath(`/master-data/${segment}`, "get", {
      security: cookieSecurity,
      operationId,
      summary: description,
      description,
      tags: ["Master Data"],
      responses: jsonResponses({ successDescription: description }),
    });
  }
  registerPath("/master-data/warehouses/{code}/bins", "get", {
    security: cookieSecurity,
    operationId: "listWarehouseBins",
    summary: "List warehouse bins",
    description: "Bins for a warehouse code.",
    tags: ["Master Data"],
    responses: jsonResponses({ successDescription: "Bin list." }),
  });
  registerPath("/master-data/product-warehouse-stocks", "get", {
    security: cookieSecurity,
    operationId: "listProductWarehouseStocks",
    summary: "Product warehouse stocks",
    description: "On-hand stock by warehouse for a selected item.",
    tags: ["Master Data"],
    responses: jsonResponses({ successDescription: "Stock rows." }),
  });

  // --- Documents (sql-style bulk helper) ---
  registerAllDocumentModulePaths();

  // --- Bank / relationship / attachments ---
  registerPath("/bank-details", "get", {
    security: cookieSecurity,
    operationId: "listBankDetails",
    summary: "List bank details",
    description: "Bank master (ODSC) for payment screens.",
    tags: ["Bank Details"],
    responses: jsonResponses({ successDescription: "Bank details list." }),
  });
  registerPath("/relationship-map/{docType}/{docEntry}", "get", {
    security: cookieSecurity,
    operationId: "getRelationshipMap",
    summary: "Get relationship map",
    description: "Preceding/succeeding document graph for a document entry.",
    tags: ["Relationship Map"],
    responses: jsonResponses({
      successDescription: "Relationship graph.",
      includeNotFound: true,
    }),
  });
  registerPath("/attachments", "post", {
    security: cookieSecurity,
    operationId: "uploadAttachment",
    summary: "Upload attachment",
    description: "Uploads files into tenant attachment storage.",
    tags: ["Attachments"],
    responses: jsonResponses({
      successStatus: "201",
      successDescription: "Attachment uploaded.",
    }),
  });
  registerPath("/attachments/{id}", "get", {
    security: cookieSecurity,
    operationId: "getAttachment",
    summary: "Get attachment",
    description: "Download or metadata for an attachment id.",
    tags: ["Attachments"],
    responses: jsonResponses({
      successDescription: "Attachment payload.",
      includeNotFound: true,
    }),
  });

  // --- Dashboard ---
  registerPath("/dashboard/overview", "get", {
    security: cookieSecurity,
    operationId: "getDashboardOverview",
    summary: "Overview dashboard",
    description:
      "Unified post-login overview: open PQ/SQ/PO, AR approval pending (OWDD ObjType 13), IC partners (IC_BP_MAPPING), statement balance + open-invoice aging for connected cards.",
    tags: ["Dashboard"],
    responses: jsonResponses({ successDescription: "Overview dashboard payload." }),
  });

  // --- Health ---
  registerPath("/health", "get", {
    security: [],
    operationId: "healthCheck",
    summary: "Health check",
    description: "Liveness probe; includes HANA pool connectivity when available.",
    tags: ["Health"],
    responses: jsonResponses({
      successDescription: "Service is up.",
      publicRoute: true,
      includeValidationError: false,
    }),
  });
};
