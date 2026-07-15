import { describe, expect, it } from "vitest";

import { normalizeEndpointGroup, routeLabel, truncateSql } from "@/core/observability/attributes";

describe("normalizeEndpointGroup", () => {
  it("strips Service Layer prefix and entity keys", () => {
    expect(normalizeEndpointGroup("/b1s/v1/Orders(123)")).toBe("Orders");
    expect(normalizeEndpointGroup("/b1s/v1/BusinessPartners('V001')")).toBe("BusinessPartners");
    expect(normalizeEndpointGroup("PurchaseOrders")).toBe("PurchaseOrders");
  });

  it("returns unknown for empty input", () => {
    expect(normalizeEndpointGroup("")).toBe("unknown");
  });
});

describe("routeLabel", () => {
  it("joins baseUrl and route path", () => {
    expect(routeLabel("/api/v1", "/orders/:id")).toBe("/api/v1/orders/:id");
  });

  it("falls back when no route", () => {
    expect(routeLabel(undefined, undefined)).toBe("unmatched");
  });
});

describe("truncateSql", () => {
  it("collapses whitespace and truncates", () => {
    const long = `SELECT ${"x".repeat(200)} FROM dual`;
    const out = truncateSql(long, 40);
    expect(out.length).toBeLessThanOrEqual(41);
    expect(out.endsWith("…")).toBe(true);
  });
});
