import { describe, expect, it } from "vitest";

import { afterPoCreated } from "@/modules/intercompany/api/hooks/after-po-created.hook";
import { afterPqDraftSaved } from "@/modules/intercompany/api/hooks/after-pq-draft-saved.hook";
import { getIcHealth } from "@/modules/intercompany/api/ic.controller";
import type { Request, Response } from "express";

describe("IC hooks + health (P2/P3 shell)", () => {
  it("hooks return skipped not_implemented without throwing", async () => {
    await expect(
      afterPqDraftSaved({ cardCode: "V", dbName: "DB_A", docEntry: 1 }),
    ).resolves.toMatchObject({ status: "skipped" });
    await expect(
      afterPoCreated({ cardCode: "V", dbName: "DB_A", docEntry: 1 }),
    ).resolves.toMatchObject({ status: "skipped" });
  });

  it("health returns ok", () => {
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
      data: { ok: true, module: "intercompany" },
      success: true,
    });
  });
});
