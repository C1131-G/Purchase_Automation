import { describe, expect, it } from "vitest";
import request from "supertest";

import { app } from "../helpers/app";

/**
 * HTTP integration against the real Express app (no listen).
 * Authenticated happy-paths are covered via controller unit tests with
 * mocked services — session/tenant stack requires a live DB otherwise.
 */
describe("Purchase Order routes", () => {
  it("returns 401 when listing without authentication", async () => {
    const res = await request(app).get("/api/v1/purchase-orders");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/auth/i);
  });

  it("returns 401 when creating without authentication", async () => {
    const res = await request(app).post("/api/v1/purchase-orders").send({});

    expect(res.status).toBe(401);
  });

  it("returns 401 when cancelling without authentication", async () => {
    const res = await request(app).post("/api/v1/purchase-orders/1/cancel");

    expect(res.status).toBe(401);
  });
});
