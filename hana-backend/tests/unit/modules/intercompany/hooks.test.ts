import { describe, expect, it } from "vitest";

import { afterPoCreated } from "@/modules/intercompany/api/hooks/after-po-created.hook";
import { afterPoUpdated } from "@/modules/intercompany/api/hooks/after-po-updated.hook";
import { afterPqDraftSaved } from "@/modules/intercompany/api/hooks/after-pq-saved.hook";
import { afterPqUpdated } from "@/modules/intercompany/api/hooks/after-pq-updated.hook";
import { getIcHealth } from "@/modules/intercompany/api/ic.controller";
import type { Request, Response } from "express";

describe("IC hooks + health", () => {
  it("afterPqDraftSaved accepts immediately (IC background; never throws)", async () => {
    const result = await afterPqDraftSaved({ cardCode: "V", dbName: "DB_A", docEntry: 1 });
    expect(result).toMatchObject({ flow: "flow1", status: "accepted" });
  });

  it("afterPqUpdated accepts immediately as edit sync (not Flow 1)", async () => {
    const result = await afterPqUpdated({ cardCode: "V", dbName: "DB_A", docEntry: 1 });
    expect(result).toMatchObject({ flow: "edit", status: "accepted" });
  });

  it("afterPoUpdated accepts immediately as edit sync (not Flow 2)", async () => {
    const result = await afterPoUpdated({ cardCode: "V", dbName: "DB_A", docEntry: 1 });
    expect(result).toMatchObject({ flow: "edit", status: "accepted" });
  });

  it("afterPoCreated draft still runs via background accept (never throws)", async () => {
    // Default hook schedules work and returns accepted; draft_po skip happens off-request.
    const result = await afterPoCreated({
      cardCode: "V",
      dbName: "DB_A",
      docEntry: 1,
      isDraft: true,
    });
    expect(result).toMatchObject({ flow: "flow2", status: "accepted" });
  });

  it("health returns ok with P7 phase", () => {
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
      data: { module: "intercompany", ok: true, phase: "P9" },
      success: true,
    });
  });
});
