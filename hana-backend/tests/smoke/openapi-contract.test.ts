import { describe, expect, it } from "vitest";

import { generateOpenApiSpec } from "@/config/swagger";

/** Core mounts from routes/api.routes.ts that must appear in the OpenAPI contract. */
const REQUIRED_PATH_PREFIXES = [
  "/auth/login",
  "/auth/me",
  "/auth/logout",
  "/organizations",
  "/purchase-orders",
  "/purchase-quotations",
  "/grpos",
  "/ap-invoices",
  "/ap-credit-memos",
  "/sales-quotations",
  "/outgoing-payments",
  "/bank-details",
  "/relationship-map/{docType}/{docEntry}",
  "/attachments",
  "/master-data/vendors",
  "/master-data/products",
  "/dashboard/overview",
  "/health",
];

describe("OpenAPI contract (sql-style full coverage + quality)", () => {
  const document = generateOpenApiSpec() as {
    openapi?: string;
    info?: { version?: string; title?: string };
    servers?: Array<{ url?: string }>;
    components?: {
      securitySchemes?: Record<string, unknown>;
      schemas?: Record<string, unknown>;
    };
    paths?: Record<
      string,
      Record<string, { operationId?: string; responses?: Record<string, unknown> }>
    >;
    security?: unknown[];
  };

  it("is OpenAPI 3.1 with /api/v1 server and CookieAuth", () => {
    expect(document.openapi).toMatch(/^3\.1/);
    expect(document.info?.version).toBe("1.0.0");
    expect(document.servers?.[0]?.url).toBe("/api/v1");
    expect(document.components?.securitySchemes?.CookieAuth).toBeTruthy();
    expect(document.security).toEqual([{ CookieAuth: [] }]);
  });

  it("registers shared response schemas in components", () => {
    const schemas = document.components?.schemas ?? {};
    expect(schemas.SuccessResponse).toBeTruthy();
    expect(schemas.ErrorResponse).toBeTruthy();
    expect(schemas.PaginatedResponse).toBeTruthy();
  });

  it("covers every core Express mount (sql-style full surface)", () => {
    const paths = Object.keys(document.paths ?? {});
    for (const required of REQUIRED_PATH_PREFIXES) {
      expect(paths, `missing path ${required}`).toContain(required);
    }
  });

  it("gives every operation a unique operationId and 2xx response", () => {
    const paths = document.paths ?? {};
    const operationIds = new Set<string>();
    let opCount = 0;

    for (const [pathKey, methods] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        if (!["get", "post", "put", "patch", "delete"].includes(method)) continue;
        opCount += 1;
        expect(operation.operationId, `${method} ${pathKey}`).toBeTruthy();
        expect(
          operationIds.has(operation.operationId!),
          `duplicate operationId ${operation.operationId}`,
        ).toBe(false);
        operationIds.add(operation.operationId!);
        const codes = Object.keys(operation.responses ?? {});
        expect(
          codes.some((c) => c.startsWith("2")),
          `${method} ${pathKey}`,
        ).toBe(true);
      }
    }

    // sql documents ~30+ registerPath calls; document modules multiply that.
    expect(opCount).toBeGreaterThan(40);
  });

  it("does not use legacy PascalCase SAP path names for documents", () => {
    const paths = Object.keys(document.paths ?? {});
    expect(paths.some((p) => p === "/PurchaseOrders" || p === "/APInvoice")).toBe(false);
  });

  it("documents 404 on resource-by-id and create request bodies from Zod", () => {
    const poGet = document.paths?.["/purchase-orders/{id}"]?.get;
    const poPost = document.paths?.["/purchase-orders"]?.post as
      | { requestBody?: unknown }
      | undefined;
    expect(poGet?.responses?.["404"]).toBeTruthy();
    expect(poPost?.requestBody).toBeTruthy();
    expect(document.components?.schemas?.CreatePurchaseOrderInput).toBeTruthy();
    expect(Object.keys(document.paths ?? {})).toContain("/purchase-orders/docnums");
  });
});
