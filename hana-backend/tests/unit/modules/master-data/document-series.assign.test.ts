import { beforeEach, describe, expect, it, vi } from "vitest";

const { executeTenantQuery } = vi.hoisted(() => ({ executeTenantQuery: vi.fn() }));
vi.mock("@/db/tenant-query", () => ({ executeTenantQuery }));

import { assignDocumentSeries } from "@/modules/master-data/document-series";

type StoreRow = { WarehouseCode: string; Location: string };
type SeriesRow = { Series: number; SeriesName: string; ObjectCode: string; Remark: string };

/** Fake tenant DB: POS store tables (StoreWarehouses + Stores) and SAP NNM1. */
const fakeTenantDb = (stores: StoreRow[], series: SeriesRow[]) => {
  executeTenantQuery.mockImplementation(
    async (_db: string, sql: string, params: unknown[] = []) => {
      if (sql.includes("StoreWarehouses")) {
        return stores.filter((row) => row.WarehouseCode === params[0]);
      }
      if (sql.includes("NNM1")) {
        const [objectCode, location] = params;
        return series.filter(
          (row) =>
            row.ObjectCode === objectCode &&
            row.Remark.trim().toLowerCase() === String(location).trim().toLowerCase(),
        );
      }
      return [];
    },
  );
};

const PO_OBJECT = "22";

const assign = (params: {
  warehouseCode?: string | null;
  clientPayload?: Record<string, unknown>;
}) => {
  const sapPayload: Record<string, unknown> = {};
  const promise = assignDocumentSeries({
    clientPayload: params.clientPayload ?? {},
    dbName: "RCM_DB",
    objectCode: PO_OBJECT,
    sapPayload,
    warehouseCode: params.warehouseCode ?? null,
  });
  return promise.then(() => sapPayload);
};

describe("assignDocumentSeries (store-location numbering, POS rule)", () => {
  beforeEach(() => {
    executeTenantQuery.mockReset();
  });

  it("uses the series whose Remarks equals the warehouse's store location", async () => {
    fakeTenantDb(
      [
        { Location: "Labasa", WarehouseCode: "WH-LAB" },
        { Location: "Suva", WarehouseCode: "WH-SUV" },
      ],
      [
        { ObjectCode: PO_OBJECT, Remark: "Suva", Series: 12, SeriesName: "PO-SUV" },
        { ObjectCode: PO_OBJECT, Remark: "Labasa", Series: 11, SeriesName: "PO-LAB" },
      ],
    );

    const sapPayload = await assign({ warehouseCode: "WH-LAB" });

    expect(sapPayload.Series).toBe(11);
  });

  it("matches Remarks ignoring case and surrounding spaces", async () => {
    fakeTenantDb(
      [{ Location: "Labasa", WarehouseCode: "WH-LAB" }],
      [{ ObjectCode: PO_OBJECT, Remark: "  LABASA ", Series: 11, SeriesName: "PO-LAB" }],
    );

    const sapPayload = await assign({ warehouseCode: "WH-LAB" });

    expect(sapPayload.Series).toBe(11);
  });

  it("keeps the series the user picked on screen without looking up the location", async () => {
    fakeTenantDb(
      [{ Location: "Labasa", WarehouseCode: "WH-LAB" }],
      [{ ObjectCode: PO_OBJECT, Remark: "Labasa", Series: 11, SeriesName: "PO-LAB" }],
    );

    const sapPayload = await assign({ clientPayload: { Series: 99 }, warehouseCode: "WH-LAB" });

    expect(sapPayload.Series).toBe(99);
    expect(executeTenantQuery).not.toHaveBeenCalled();
  });

  it("sends no Series when no series Remarks matches the store location", async () => {
    fakeTenantDb(
      [{ Location: "Suva", WarehouseCode: "WH-SUV" }],
      [{ ObjectCode: PO_OBJECT, Remark: "Labasa", Series: 11, SeriesName: "PO-LAB" }],
    );

    const sapPayload = await assign({ warehouseCode: "WH-SUV" });

    expect(sapPayload).not.toHaveProperty("Series");
  });

  it("ignores series of other document types with the same Remarks", async () => {
    fakeTenantDb(
      [{ Location: "Labasa", WarehouseCode: "WH-LAB" }],
      [{ ObjectCode: "23", Remark: "Labasa", Series: 31, SeriesName: "SQ-LAB" }],
    );

    const sapPayload = await assign({ warehouseCode: "WH-LAB" });

    expect(sapPayload).not.toHaveProperty("Series");
  });

  it("sends no Series when the document has no warehouse", async () => {
    fakeTenantDb(
      [],
      [{ ObjectCode: PO_OBJECT, Remark: "Labasa", Series: 11, SeriesName: "PO-LAB" }],
    );

    const sapPayload = await assign({ warehouseCode: null });

    expect(sapPayload).not.toHaveProperty("Series");
  });

  it("sends no Series when the warehouse is not linked to a POS store", async () => {
    fakeTenantDb(
      [{ Location: "Labasa", WarehouseCode: "WH-LAB" }],
      [{ ObjectCode: PO_OBJECT, Remark: "Labasa", Series: 11, SeriesName: "PO-LAB" }],
    );

    const sapPayload = await assign({ warehouseCode: "WH-HO" });

    expect(sapPayload).not.toHaveProperty("Series");
  });

  it("sends no Series (and does not fail posting) when the DB has no POS store tables", async () => {
    executeTenantQuery.mockRejectedValue(new Error('invalid table name: "StoreWarehouses"'));

    const sapPayload = await assign({ warehouseCode: "WH-LAB" });

    expect(sapPayload).not.toHaveProperty("Series");
  });
});
