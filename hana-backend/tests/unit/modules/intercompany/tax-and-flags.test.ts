import { describe, expect, it } from "vitest";

import { createConfigurationQueries } from "@/modules/intercompany/config/configuration/configuration.queries";
import { createConfigurationService } from "@/modules/intercompany/config/configuration/configuration.service";
import { IC_CONFIG_KEY } from "@/modules/intercompany/infrastructure/constants";
import {
  createMemoryDb,
  createMemorySqlClient,
  seedMemoryCompanyGraph,
} from "@/modules/intercompany/testing/memory-sql";

describe("configuration flags (T3.4)", () => {
  it("T3.4 flow flags default off when config rows missing", async () => {
    const db = createMemoryDb();
    seedMemoryCompanyGraph(db);
    const sql = createMemorySqlClient(db);
    const config = createConfigurationService(createConfigurationQueries(sql));

    await expect(config.isFlow1Enabled()).resolves.toBe(false);
    await expect(config.isFlow2Enabled()).resolves.toBe(false);
    await expect(config.getFlag(IC_CONFIG_KEY.ENABLE_FLOW1_RFQ_CHAIN)).resolves.toBe(false);
  });

  it("T3.4 flags true when config set", async () => {
    const db = createMemoryDb();
    seedMemoryCompanyGraph(db);
    db.tables.IC_CONFIGURATION.push({
      CONFIG_ID: 1,
      CONFIG_KEY: IC_CONFIG_KEY.ENABLE_FLOW1_RFQ_CHAIN,
      CONFIG_VALUE: "0",
      DESCRIPTION: null,
    });
    const sql = createMemorySqlClient(db);
    const config = createConfigurationService(createConfigurationQueries(sql));
    await expect(config.isFlow1Enabled()).resolves.toBe(false);

    db.tables.IC_CONFIGURATION[0].CONFIG_VALUE = "1";
    await expect(config.isFlow1Enabled()).resolves.toBe(true);
  });
});
