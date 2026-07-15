import { describe, expect, it } from "vitest";

import { generateOpenApiSpec } from "@/config/swagger";

const REQUIRED_PATHS = [
  "/auth/login",
  "/auth/me",
  "/auth/logout",
  "/master-data/vendors",
  "/master-data/products",
  "/purchase-orders",
  "/sales-orders",
  "/grpos",
  "/ap-invoices",
  "/ar-invoices",
  "/goods-receipts",
  "/incoming-payments",
  "/items",
  "/bank-details",
  "/dashboard/summary",
  "/health",
];

describe("OpenAPI contract (full rules)", () => {
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

  it("is OpenAPI 3.1 with versioned server and CookieAuth", () => {
    expect(document.openapi).toMatch(/^3\.1/);
    expect(document.info?.version).toBe("1.0.0");
    expect(document.servers?.[0]?.url).toBe("/api/v1");
    expect(document.components?.securitySchemes?.CookieAuth).toBeTruthy();
    expect(document.security).toEqual([{ CookieAuth: [] }]);
  });

  it("registers shared response schemas once", () => {
    const schemas = document.components?.schemas ?? {};
    expect(schemas.SuccessResponse).toBeTruthy();
    expect(schemas.ErrorResponse).toBeTruthy();
    expect(schemas.PaginatedResponse).toBeTruthy();
    expect(schemas.LoginInput).toBeTruthy();
  });

  it("covers core Express mounts", () => {
    const paths = Object.keys(document.paths ?? {});
    for (const required of REQUIRED_PATHS) {
      expect(paths, `missing ${required}`).toContain(required);
    }
  });

  it("gives every operation a unique operationId and documents 2xx", () => {
    const paths = document.paths ?? {};
    const ids = new Set<string>();
    let count = 0;
    for (const [pathKey, methods] of Object.entries(paths)) {
      for (const [method, op] of Object.entries(methods)) {
        if (!["get", "post", "put", "patch", "delete"].includes(method)) continue;
        count += 1;
        expect(op.operationId, `${method} ${pathKey}`).toBeTruthy();
        expect(ids.has(op.operationId!), `dup ${op.operationId}`).toBe(false);
        ids.add(op.operationId!);
        expect(Object.keys(op.responses ?? {}).some((c) => c.startsWith("2"))).toBe(true);
      }
    }
    expect(count).toBeGreaterThan(40);
  });

  it("documents 404 on resource-by-id GET/PATCH and request bodies on create", () => {
    const poGet = document.paths?.["/purchase-orders/{id}"]?.get;
    const poPatch = document.paths?.["/purchase-orders/{id}"]?.patch;
    const poPost = document.paths?.["/purchase-orders"]?.post as
      | { requestBody?: unknown; responses?: Record<string, unknown> }
      | undefined;

    expect(poGet?.responses?.["404"]).toBeTruthy();
    expect(poPatch?.responses?.["404"]).toBeTruthy();
    expect(poPost?.requestBody).toBeTruthy();
    expect(document.components?.schemas?.CreatePurchaseOrderInput).toBeTruthy();
    expect(Object.keys(document.paths ?? {})).toContain("/purchase-orders/docnums");
    expect(Object.keys(document.paths ?? {})).not.toContain("/purchase-orders/doc-nums");
  });
});
