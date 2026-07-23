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
});
