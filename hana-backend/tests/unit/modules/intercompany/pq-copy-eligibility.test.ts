import { describe, expect, it } from "vitest";

import AppError from "@/core/errors/app-error";
import {
  collectPqBaseEntries,
  createPqCopyEligibility,
  PQ_RFQ_COPY_BLOCKED_MESSAGE,
} from "@/modules/intercompany/api/pq-copy-eligibility";
import { createCompanyQueries } from "@/modules/intercompany/config/company/company.queries";
import { createCompanyService } from "@/modules/intercompany/config/company/company.service";
import { createConfigurationQueries } from "@/modules/intercompany/config/configuration/configuration.queries";
import { createConfigurationService } from "@/modules/intercompany/config/configuration/configuration.service";
import { createRfqMutations } from "@/modules/intercompany/domain/rfq/rfq.mutations";
import { createRfqQueries } from "@/modules/intercompany/domain/rfq/rfq.queries";
import { createRfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import { IC_CONFIG_KEY } from "@/modules/intercompany/infrastructure/constants";
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
  const eligibility = createPqCopyEligibility({
    company: createCompanyService(createCompanyQueries(sql)),
    configuration: createConfigurationService(createConfigurationQueries(sql)),
    rfq: createRfqService({
      mutations: createRfqMutations(sql),
      queries: createRfqQueries(sql),
    }),
  });
  return { db, eligibility };
};

const addRfq = (
  db: ReturnType<typeof createMemoryDb>,
  status: "DRAFT" | "SUBMITTED" | "COMPLETED" | "CANCELLED",
  pqDocEntry = 55,
): void => {
  db.tables.IC_RFQ_HEADER.push({
    PQ_DRAFT_DOC_ENTRY: pqDocEntry,
    PQ_DRAFT_DOC_NUM: 9001,
    RFQ_ID: db.tables.IC_RFQ_HEADER.length + 1,
    RFQ_NUMBER: "9001",
    SOURCE_COMPANY_ID: 1,
    STATUS: status,
    TARGET_COMPANY_ID: 2,
    VENDOR_CODE: "V-B",
  });
};

describe("PQ copy eligibility", () => {
  it("collects only purchase-quotation base entries", () => {
    expect(
      collectPqBaseEntries([
        { BaseType: 540000006, BaseEntry: 11 },
        { BaseType: 22, BaseEntry: 99 },
        { BaseType: 540000006, BaseEntry: "11" },
        { BaseType: 540000006, BaseEntry: 12 },
      ]),
    ).toEqual([11, 12]);
  });

  it("allows copy when Flow 1 is off", async () => {
    const { eligibility } = createStack(false);

    await expect(eligibility.getEligibility("DB_A", 55)).resolves.toMatchObject({
      allowed: true,
      reason: "flow1_disabled",
    });
    await expect(eligibility.listAllowedDocEntries("DB_A")).resolves.toBeNull();
  });

  it("allows copy when the company is not on the IC graph", async () => {
    const { eligibility } = createStack();

    await expect(eligibility.getEligibility("UNKNOWN_DB", 55)).resolves.toMatchObject({
      allowed: true,
      reason: "not_ic_company",
    });
    await expect(eligibility.listAllowedDocEntries("UNKNOWN_DB")).resolves.toBeNull();
  });

  it("blocks copy when the PQ has no RFQ", async () => {
    const { eligibility } = createStack();

    await expect(eligibility.getEligibility("DB_A", 55)).resolves.toMatchObject({
      allowed: false,
      reason: "rfq_not_submitted",
      rfqStatus: null,
    });
  });

  it.each(["DRAFT", "CANCELLED"] as const)("blocks copy while the RFQ is %s", async (status) => {
    const { db, eligibility } = createStack();
    addRfq(db, status);

    await expect(eligibility.getEligibility("DB_A", 55)).resolves.toMatchObject({
      allowed: false,
      reason: "rfq_not_submitted",
      rfqStatus: status,
    });
  });

  it.each(["SUBMITTED", "COMPLETED"] as const)("allows copy when the RFQ is %s", async (status) => {
    const { db, eligibility } = createStack();
    addRfq(db, status);

    await expect(eligibility.getEligibility("DB_A", 55)).resolves.toMatchObject({
      allowed: true,
      reason: "rfq_submitted",
      rfqStatus: status,
    });
  });

  it("rejects copy-from lines until the RFQ is submitted", async () => {
    const { eligibility } = createStack();

    await expect(
      eligibility.assertLinesCopyAllowed("DB_A", [{ BaseType: 540000006, BaseEntry: 55 }]),
    ).rejects.toMatchObject({
      errorCode: "IC_PQ_COPY_BLOCKED",
      message: PQ_RFQ_COPY_BLOCKED_MESSAGE,
      statusCode: 409,
    } satisfies Partial<AppError>);
  });

  it("lists only submitted RFQ PQ entries for copy-from filters", async () => {
    const { db, eligibility } = createStack();
    addRfq(db, "DRAFT", 10);
    addRfq(db, "SUBMITTED", 11);
    addRfq(db, "COMPLETED", 12);

    await expect(eligibility.listAllowedDocEntries("DB_A")).resolves.toEqual([11, 12]);
  });
});
