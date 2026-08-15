import { describe, expect, it, vi } from "vitest";

import { createAfterPqUpdated } from "@/modules/intercompany/api/hooks/after-pq-updated.hook";
import { createCompanyQueries } from "@/modules/intercompany/config/company/company.queries";
import { createCompanyService } from "@/modules/intercompany/config/company/company.service";
import { createConfigurationQueries } from "@/modules/intercompany/config/configuration/configuration.queries";
import { createConfigurationService } from "@/modules/intercompany/config/configuration/configuration.service";
import { createRfqMutations } from "@/modules/intercompany/domain/rfq/rfq.mutations";
import { createRfqQueries } from "@/modules/intercompany/domain/rfq/rfq.queries";
import { createRfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import { createPqEditSyncService } from "@/modules/intercompany/flows/flow-1-pq-rfq-chain/01-pq-capture/pq-edit-sync.service";
import { IC_CONFIG_KEY } from "@/modules/intercompany/infrastructure/constants";
import { icLog } from "@/modules/intercompany/infrastructure/ic-logger";
import {
  createMemoryDb,
  createMemorySqlClient,
  seedMemoryCompanyGraph,
} from "@/modules/intercompany/testing/memory-sql";

const createStack = (flow1Enabled = true) => {
  const db = createMemoryDb();
  seedMemoryCompanyGraph(db);
  db.tables.IC_CONFIGURATION.push({
    CONFIG_ID: 1,
    CONFIG_KEY: IC_CONFIG_KEY.ENABLE_FLOW1_RFQ_CHAIN,
    CONFIG_VALUE: flow1Enabled ? "1" : "0",
  });
  const sql = createMemorySqlClient(db);
  const rfq = createRfqService({
    mutations: createRfqMutations(sql),
    queries: createRfqQueries(sql),
  });
  const sync = createPqEditSyncService({
    company: createCompanyService(createCompanyQueries(sql)),
    configuration: createConfigurationService(createConfigurationQueries(sql)),
    rfq,
  });
  return { db, rfq, sync };
};

const addDraftRfq = (db: ReturnType<typeof createMemoryDb>, pqDocEntry = 2137): void => {
  db.tables.IC_RFQ_HEADER.push({
    PQ_DRAFT_DOC_ENTRY: pqDocEntry,
    PQ_DRAFT_DOC_NUM: 9001,
    RFQ_ID: 1,
    RFQ_NUMBER: "9001",
    SOURCE_COMPANY_ID: 1,
    STATUS: "DRAFT",
    TARGET_COMPANY_ID: 2,
    VENDOR_CODE: "V-B",
  });
  db.tables.IC_RFQ_LINE.push({
    DISCOUNT: 0,
    ITEM_CODE: "SELLER-ITEM",
    LINE_NUM: 0,
    QUANTITY: 4,
    RFQ_ID: 1,
    RFQ_LINE_ID: 1,
    TAX_CODE: "IN-12.5",
    UNIT_PRICE: 8,
  });
};

describe("IC edit sync (PQ update)", () => {
  it("does not use Flow 1 create logs", async () => {
    const spy = vi.spyOn(icLog, "info");
    const { db, sync } = createStack();
    addDraftRfq(db);

    await sync.sync({
      cardCode: "V-B",
      dbName: "DB_A",
      docEntry: 2137,
      lines: [{ ItemCode: "BUYER-ITEM", LineNum: 0, Quantity: 0, RequiredQuantity: 6 }],
    });

    const calls = spy.mock.calls.map(([scope, msg, fields]) => ({
      check: fields?.check,
      kind: fields?.kind,
      msg,
      scope,
      step: fields?.step,
    }));
    expect(calls.some((row) => row.msg.startsWith("IC edit sync —"))).toBe(true);
    expect(calls.some((row) => row.msg.includes("Flow 1"))).toBe(false);
    expect(calls.some((row) => /\[\d+\/\d+\]/.test(row.msg))).toBe(false);
    expect(
      calls.some(
        (row) =>
          row.scope === "ic.edit" && row.check === "ic_edit_sync" && row.kind === "edit_sync",
      ),
    ).toBe(true);
    expect(calls.some((row) => row.scope === "ic.flow1")).toBe(false);
    expect(calls.some((row) => row.step != null)).toBe(false);
    spy.mockRestore();
  });

  it("syncs tax onto an existing DRAFT RFQ without creating another RFQ", async () => {
    const { db, sync } = createStack();
    addDraftRfq(db);

    const result = await sync.sync({
      cardCode: "",
      dbName: "DB_A",
      docEntry: 2137,
      lines: [
        {
          ItemCode: "BUYER-ITEM",
          LineNum: 0,
          Quantity: 0,
          RequiredQuantity: 6,
          VatGroup: "IN-18",
        },
      ],
    });

    expect(result).toMatchObject({ status: "success", targetDoc: { entry: 1, type: "RFQ" } });
    expect(db.tables.IC_RFQ_HEADER).toHaveLength(1);
    expect(db.tables.IC_RFQ_LINE[0]).toMatchObject({
      QUANTITY: 4,
      TAX_CODE: "IN-18",
      UNIT_PRICE: 8,
    });
  });

  it("skips when no RFQ exists instead of running Flow 1 create", async () => {
    const { db, sync } = createStack();

    await expect(
      sync.sync({ cardCode: "V-B", dbName: "DB_A", docEntry: 2137 }),
    ).resolves.toMatchObject({ reason: "no_rfq", status: "skipped" });
    expect(db.tables.IC_RFQ_HEADER).toHaveLength(0);
  });

  it("skips SUBMITTED RFQs", async () => {
    const { db, sync } = createStack();
    addDraftRfq(db);
    db.tables.IC_RFQ_HEADER[0].STATUS = "SUBMITTED";

    await expect(
      sync.sync({ cardCode: "V-B", dbName: "DB_A", docEntry: 2137 }),
    ).resolves.toMatchObject({ reason: "rfq_not_editable", status: "skipped" });
  });

  it("afterPqUpdated accepts immediately with flow=edit", async () => {
    const hook = createAfterPqUpdated(createStack().sync);
    await expect(hook({ cardCode: "V-B", dbName: "DB_A", docEntry: 2137 })).resolves.toMatchObject({
      flow: "edit",
      status: "accepted",
    });
  });
});
