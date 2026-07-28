import { describe, expect, it } from "vitest";

import { createCompanyQueries } from "@/modules/intercompany/config/company/company.queries";
import { createCompanyService } from "@/modules/intercompany/config/company/company.service";
import { createDocumentMapQueries } from "@/modules/intercompany/domain/document-map/document-map.queries";
import { createRfqMutations } from "@/modules/intercompany/domain/rfq/rfq.mutations";
import { createRfqQueries } from "@/modules/intercompany/domain/rfq/rfq.queries";
import { createRfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import { IC_OBJECT } from "@/modules/intercompany/infrastructure/object-codes";
import {
  createMemoryDb,
  createMemorySqlClient,
  seedMemoryCompanyGraph,
} from "@/modules/intercompany/testing/memory-sql";
import {
  getIcRfqRelationshipMap,
  resolveIcRfqForSalesQuotation,
} from "@/modules/relationship-map/relationship-map.ic.queries";

const seedRfqToSqLink = () => {
  const db = createMemoryDb();
  seedMemoryCompanyGraph(db);

  db.tables.IC_RFQ_HEADER.push({
    CREATED_BY: "tester",
    PQ_DRAFT_DOC_ENTRY: 900,
    PQ_DRAFT_DOC_NUM: 8000590,
    REMARKS: null,
    RFQ_ID: 95,
    RFQ_NUMBER: "8000590",
    SOURCE_COMPANY_ID: 1,
    STATUS: "COMPLETED",
    TARGET_COMPANY_ID: 2,
    VENDOR_CODE: "V-B",
  });

  db.tables.IC_DOCUMENT_MAPPING.push({
    ERROR_MESSAGE: null,
    MAPPING_ID: 1,
    SOURCE_COMPANY_ID: 1,
    SOURCE_DOC_ENTRY: "95",
    SOURCE_DOC_NUM: "8000590",
    SOURCE_OBJECT: IC_OBJECT.RFQ,
    SOURCE_REMARKS_TAG: null,
    STATUS: "SUCCESS",
    TARGET_COMPANY_ID: 2,
    TARGET_DOC_ENTRY: "501",
    TARGET_DOC_NUM: "12045",
    TARGET_OBJECT: IC_OBJECT.SQ,
  });

  const sql = createMemorySqlClient(db);
  const deps = {
    company: createCompanyService(createCompanyQueries(sql)),
    documentMap: createDocumentMapQueries(sql),
    rfq: createRfqService({
      mutations: createRfqMutations(sql),
      queries: createRfqQueries(sql),
    }),
  };

  return { db, deps };
};

describe("IC RFQ ↔ auto-generated SQ relationship map", () => {
  it("resolves linked SQ when hovering RFQ doc number", async () => {
    const { deps } = seedRfqToSqLink();

    const map = await getIcRfqRelationshipMap("DB_B", 95, deps);

    expect(map.requestForQuotation).toEqual([{ docEntry: 95, docNum: 8000590 }]);
    expect(map.salesQuotation).toEqual([{ docEntry: 501, docNum: 12045 }]);
    expect(map.salesOrder).toEqual([]);
    expect(map.arInvoice).toEqual([]);
  });

  it("resolves upstream RFQ when hovering auto-generated SQ", async () => {
    const { deps } = seedRfqToSqLink();

    const rfq = await resolveIcRfqForSalesQuotation("DB_B", 501, deps);

    expect(rfq).toEqual([{ docEntry: 95, docNum: 8000590 }]);
  });

  it("returns RFQ-only map before SQ is generated", async () => {
    const { deps, db } = seedRfqToSqLink();
    db.tables.IC_DOCUMENT_MAPPING.length = 0;

    const map = await getIcRfqRelationshipMap("DB_B", 95, deps);

    expect(map.requestForQuotation).toEqual([{ docEntry: 95, docNum: 8000590 }]);
    expect(map.salesQuotation).toEqual([]);
  });
});
