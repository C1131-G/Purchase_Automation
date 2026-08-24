import { describe, expect, it } from "vitest";

import { createIcRevisionService } from "@/modules/intercompany/domain/revision/revision.service";
import type { IcSqlClient } from "@/modules/intercompany/infrastructure/ic-sql";

const sqlFor = (state: {
  rfq?: Record<string, unknown>;
  mapping?: Record<string, unknown>;
  notification?: Record<string, unknown>;
  retry?: Record<string, unknown>;
}): IcSqlClient => ({
  query: async (statement) => {
    if (statement.includes('FROM "IC_RFQ_HEADER"')) return [state.rfq ?? {}];
    if (statement.includes('FROM "IC_DOCUMENT_MAPPING"')) return [state.mapping ?? {}];
    if (statement.includes('FROM "IC_NOTIFICATION"')) return [state.notification ?? {}];
    if (statement.includes('FROM "IC_RETRY_QUEUE"')) return [state.retry ?? {}];
    return [];
  },
});

describe("IC revision service", () => {
  it("returns a stable token until an existing IC row changes", async () => {
    const state = {
      rfq: { RFQ_ID: 10, HEADER_UPDATED_AT: "2026-08-24 10:00:00", LINE_UPDATED_AT: "" },
      mapping: { MAPPING_ID: 20, UPDATED_AT: "2026-08-24 10:00:01" },
      notification: { NOTIFICATION_ID: 30 },
      retry: { RETRY_ID: 40, UPDATED_AT: "2026-08-24 10:00:02" },
    };
    const service = createIcRevisionService(sqlFor(state));

    const first = await service.getForCompany(8);
    const second = await service.getForCompany(8);
    expect(second).toBe(first);

    state.mapping.UPDATED_AT = "2026-08-24 10:00:03";
    expect(await service.getForCompany(8)).not.toBe(first);
  });

  it("binds the session company to every visibility query", async () => {
    const params: unknown[][] = [];
    const sql: IcSqlClient = {
      query: async (_statement, values) => {
        params.push(values ?? []);
        return [{}];
      },
    };

    await createIcRevisionService(sql).getForCompany(17);
    expect(params).toEqual([[17, 17], [17, 17], [17], [17]]);
  });
});
