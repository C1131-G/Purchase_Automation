import { describe, expect, it } from "vitest";

import { afterPoCreated } from "@/modules/intercompany/api/hooks/after-po-created.hook";
import { afterPqDraftSaved } from "@/modules/intercompany/api/hooks/after-pq-draft-saved.hook";
import { getIcHealth } from "@/modules/intercompany/api/ic.controller";
import type { Request, Response } from "express";

describe("IC hooks + health", () => {
  it("afterPqDraftSaved never throws (may skip or fail without DB)", async () => {
    const result = await afterPqDraftSaved({ cardCode: "V", dbName: "DB_A", docEntry: 1 });
    expect(["skipped", "failed", "success"]).toContain(result.status);
  });

  it("afterPoCreated never throws (may skip or fail without DB)", async () => {
    const result = await afterPoCreated({
      cardCode: "V",
      dbName: "DB_A",
      docEntry: 1,
      isDraft: true,
    });
    expect(result.status).toBe("skipped");
    expect(result).toMatchObject({ reason: "draft_po" });
  });

  it("health returns ok with P6 phase", () => {
    const res = {
      statusCode: 200,
      body: undefined as unknown,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: unknown) {
        this.body = payload;
        return this;
      },
    };
    getIcHealth({} as Request, res as unknown as Response);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      data: { module: "intercompany", ok: true, phase: "P6" },
      success: true,
    });
  });
});
