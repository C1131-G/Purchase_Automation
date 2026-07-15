import { describe, expect, it } from "vitest";
import request from "supertest";

import { app } from "../helpers/app";

describe("ap-invoice routes (HANA)", () => {
  it("returns 401 when listing without authentication", async () => {
    const res = await request(app).get("/api/v1/ap-invoices");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 when creating without authentication", async () => {
    const res = await request(app).post("/api/v1/ap-invoices").send({});
    expect(res.status).toBe(401);
  });

  it("returns 401 when cancelling without authentication", async () => {
    const res = await request(app).post("/api/v1/ap-invoices/1/cancel");
    expect(res.status).toBe(401);
  });
});
