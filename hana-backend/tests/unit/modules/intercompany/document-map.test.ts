import { describe, expect, it } from "vitest";

import { createDocumentMapMutations } from "@/modules/intercompany/domain/document-map/document-map.mutations";
import { createDocumentMapQueries } from "@/modules/intercompany/domain/document-map/document-map.queries";
import { createDocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import { IC_DOC_MAP_STATUS } from "@/modules/intercompany/infrastructure/constants";
import { IC_OBJECT } from "@/modules/intercompany/infrastructure/object-codes";
import { createMemoryDb, createMemorySqlClient } from "@/modules/intercompany/testing/memory-sql";

describe("document-map (T3.5)", () => {
  it("T3.5 double create does not duplicate SUCCESS path", async () => {
    const db = createMemoryDb();
    const sql = createMemorySqlClient(db);
    const service = createDocumentMapService({
      mutations: createDocumentMapMutations(sql),
      queries: createDocumentMapQueries(sql),
    });

    const first = await service.create({
      sourceCompanyId: 1,
      sourceDocEntry: "100",
      sourceObject: IC_OBJECT.PO,
      status: IC_DOC_MAP_STATUS.SUCCESS,
      targetCompanyId: 2,
      targetDocEntry: "200",
      targetObject: IC_OBJECT.AR_DRAFT,
    });

    const second = await service.create({
      sourceCompanyId: 1,
      sourceDocEntry: "100",
      sourceObject: IC_OBJECT.PO,
      status: IC_DOC_MAP_STATUS.SUCCESS,
      targetCompanyId: 2,
      targetDocEntry: "999",
      targetObject: IC_OBJECT.AR_DRAFT,
    });

    expect(second.mappingId).toBe(first.mappingId);
    expect(second.targetDocEntry).toBe("200");
    expect(db.tables.IC_DOCUMENT_MAPPING).toHaveLength(1);
  });

  it("findByTarget resolves seller SQ back to IC RFQ", async () => {
    const db = createMemoryDb();
    const sql = createMemorySqlClient(db);
    const queries = createDocumentMapQueries(sql);

    await createDocumentMapService({
      mutations: createDocumentMapMutations(sql),
      queries,
    }).create({
      sourceCompanyId: 1,
      sourceDocEntry: "42",
      sourceDocNum: "9001",
      sourceObject: IC_OBJECT.RFQ,
      status: IC_DOC_MAP_STATUS.SUCCESS,
      targetCompanyId: 2,
      targetDocEntry: "8100",
      targetDocNum: "810",
      targetObject: IC_OBJECT.SQ,
    });

    const map = await queries.findByTarget({
      sourceObject: IC_OBJECT.RFQ,
      targetCompanyId: 2,
      targetDocEntry: "8100",
      targetObject: IC_OBJECT.SQ,
    });

    expect(map?.sourceDocEntry).toBe("42");
    expect(map?.sourceDocNum).toBe("9001");
  });

  it("findBySource prefers SUCCESS with target over earlier ERROR empty row", async () => {
    const db = createMemoryDb();
    const sql = createMemorySqlClient(db);
    const mutations = createDocumentMapMutations(sql);
    const queries = createDocumentMapQueries(sql);

    await mutations.insert({
      errorMessage: "SQ failed",
      sourceCompanyId: 1,
      sourceDocEntry: "25",
      sourceObject: IC_OBJECT.RFQ,
      status: IC_DOC_MAP_STATUS.ERROR,
      targetCompanyId: 2,
      targetObject: IC_OBJECT.SQ,
    });
    await mutations.insert({
      sourceCompanyId: 1,
      sourceDocEntry: "25",
      sourceObject: IC_OBJECT.RFQ,
      status: IC_DOC_MAP_STATUS.SUCCESS,
      targetCompanyId: 2,
      targetDocEntry: "910",
      targetDocNum: "5001",
      targetObject: IC_OBJECT.SQ,
    });

    const map = await queries.findBySource({
      sourceCompanyId: 1,
      sourceDocEntry: "25",
      sourceObject: IC_OBJECT.RFQ,
      targetObject: IC_OBJECT.SQ,
    });

    expect(map?.status).toBe(IC_DOC_MAP_STATUS.SUCCESS);
    expect(map?.targetDocEntry).toBe("910");
  });

  it("create SUCCESS repairs existing ERROR row instead of inserting a second map", async () => {
    const db = createMemoryDb();
    const sql = createMemorySqlClient(db);
    const service = createDocumentMapService({
      mutations: createDocumentMapMutations(sql),
      queries: createDocumentMapQueries(sql),
    });

    const failed = await service.create({
      errorMessage: "SL timeout",
      sourceCompanyId: 1,
      sourceDocEntry: "25",
      sourceObject: IC_OBJECT.RFQ,
      status: IC_DOC_MAP_STATUS.ERROR,
      targetCompanyId: 2,
      targetObject: IC_OBJECT.SQ,
    });

    const repaired = await service.create({
      sourceCompanyId: 1,
      sourceDocEntry: "25",
      sourceObject: IC_OBJECT.RFQ,
      status: IC_DOC_MAP_STATUS.SUCCESS,
      targetCompanyId: 2,
      targetDocEntry: "910",
      targetDocNum: "5001",
      targetObject: IC_OBJECT.SQ,
    });

    expect(repaired.mappingId).toBe(failed.mappingId);
    expect(repaired.status).toBe(IC_DOC_MAP_STATUS.SUCCESS);
    expect(repaired.targetDocEntry).toBe("910");
    expect(db.tables.IC_DOCUMENT_MAPPING).toHaveLength(1);
  });
});
