import { describe, expect, it } from "vitest";

import { validateSession } from "@/core/middleware/auth.middleware";
import { icRoutes } from "@/modules/intercompany/api/ic.routes";

/**
 * ic-routes-auth.test.ts: IC route auth ordering — health open, business guarded.
 * Covers: health placement, validateSession ordering, protected routes.
 */
// Verifies validateSession sits after health, before business routes.
describe("ic routes auth", () => {
  // Verifies auth middleware ordering around business routes.
  it("runs validateSession after health and before business routes", () => {
    const layers = icRoutes.stack as Array<{
      handle?: { name?: string };
      name?: string;
      regexp?: { toString(): string };
    }>;
    const healthIndex = layers.findIndex((layer) => String(layer.regexp).includes("health"));
    const authIndex = layers.findIndex(
      (layer) => layer.handle === validateSession || layer.name === "validateSession",
    );
    const unreadIndex = layers.findIndex((layer) => String(layer.regexp).includes("unread-count"));

    expect(healthIndex).toBeGreaterThanOrEqual(0);
    expect(authIndex).toBeGreaterThan(healthIndex);
    expect(unreadIndex).toBeGreaterThan(authIndex);
  });
});
