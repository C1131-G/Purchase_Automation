import { beforeEach, describe, expect, it, vi } from "vitest";

const { executeTenantQuery } = vi.hoisted(() => ({ executeTenantQuery: vi.fn() }));
vi.mock("@/db/tenant-query", () => ({ executeTenantQuery }));

import { assignDocumentSeries } from "@/modules/master-data/document-series";

/** Warehouse master row joined to its SAP location (OWHS.Location → OLCT.Location). */
type WarehouseLocationRow = { WarehouseCode: string; Location: string | null };
type SeriesRow = {
  Series: number;
  SeriesName: string;
  ObjectCode: string;
  Remark: string;
  BPLId: number | null;
};

/** Fake tenant DB: SAP warehouses with locations (OWHS + OLCT) and numbering series (NNM1). */
const fakeTenantDb = (warehouses: WarehouseLocationRow[], series: SeriesRow[]) => {
  executeTenantQuery.mockImplementation(
    async (_db: string, sql: string, params: unknown[] = []) => {
      if (sql.includes("OWHS")) {
        return warehouses
          .filter((row) => row.WarehouseCode === params[0])
          .map((row) => ({ Location: row.Location }));
      }
      if (sql.includes("NNM1")) {
        const [objectCode, location, branchId] = params;
        return series.filter(
          (row) =>
            row.ObjectCode === objectCode &&
            row.Remark.trim().toLowerCase() === String(location).trim().toLowerCase() &&
            row.BPLId === branchId,
        );
      }
      return [];
    },
  );
};

const PO_OBJECT = "22";
const LABASA_BRANCH = 2;
const SUVA_BRANCH = 1;

const assign = (params: {
  warehouseCode?: string | null;
  branchId?: number | null;
  clientPayload?: Record<string, unknown>;
}) => {
  const sapPayload: Record<string, unknown> = {};
  const promise = assignDocumentSeries({
    branchId: params.branchId === undefined ? LABASA_BRANCH : params.branchId,
    clientPayload: params.clientPayload ?? {},
    dbName: "RCM_DB",
    objectCode: PO_OBJECT,
    sapPayload,
    warehouseCode: params.warehouseCode ?? null,
  });
  return promise.then(() => sapPayload);
};

describe("assignDocumentSeries (SAP warehouse location + document branch)", () => {
  beforeEach(() => {
    executeTenantQuery.mockReset();
  });

  it("uses the series whose Remarks equals the warehouse's SAP location and branch", async () => {
    fakeTenantDb(
      [
        { Location: "Labasa", WarehouseCode: "WH-LAB" },
        { Location: "Suva", WarehouseCode: "WH-SUV" },
      ],
      [
        {
          ObjectCode: PO_OBJECT,
          Remark: "Suva",
          Series: 12,
          SeriesName: "PO-SUV",
          BPLId: SUVA_BRANCH,
        },
        {
          ObjectCode: PO_OBJECT,
          Remark: "Labasa",
          Series: 11,
          SeriesName: "PO-LAB",
          BPLId: LABASA_BRANCH,
        },
      ],
    );

    const sapPayload = await assign({ warehouseCode: "WH-LAB" });

    expect(sapPayload.Series).toBe(11);
  });

  it("matches Remarks ignoring case and surrounding spaces", async () => {
    fakeTenantDb(
      [{ Location: "Labasa", WarehouseCode: "WH-LAB" }],
      [
        {
          ObjectCode: PO_OBJECT,
          Remark: "  LABASA ",
          Series: 11,
          SeriesName: "PO-LAB",
          BPLId: LABASA_BRANCH,
        },
      ],
    );

    const sapPayload = await assign({ warehouseCode: "WH-LAB" });

    expect(sapPayload.Series).toBe(11);
  });

  it("keeps the series the user picked on screen without looking up the location", async () => {
    fakeTenantDb(
      [{ Location: "Labasa", WarehouseCode: "WH-LAB" }],
      [
        {
          ObjectCode: PO_OBJECT,
          Remark: "Labasa",
          Series: 11,
          SeriesName: "PO-LAB",
          BPLId: LABASA_BRANCH,
        },
      ],
    );

    const sapPayload = await assign({ clientPayload: { Series: 99 }, warehouseCode: "WH-LAB" });

    expect(sapPayload.Series).toBe(99);
    expect(executeTenantQuery).not.toHaveBeenCalled();
  });

  it("sends no Series when no series Remarks matches the warehouse location", async () => {
    fakeTenantDb(
      [{ Location: "Suva", WarehouseCode: "WH-SUV" }],
      [
        {
          ObjectCode: PO_OBJECT,
          Remark: "Labasa",
          Series: 11,
          SeriesName: "PO-LAB",
          BPLId: LABASA_BRANCH,
        },
      ],
    );

    const sapPayload = await assign({ warehouseCode: "WH-SUV" });

    expect(sapPayload).not.toHaveProperty("Series");
  });

  it("ignores series of other document types with the same Remarks", async () => {
    fakeTenantDb(
      [{ Location: "Labasa", WarehouseCode: "WH-LAB" }],
      [
        {
          ObjectCode: "23",
          Remark: "Labasa",
          Series: 31,
          SeriesName: "SQ-LAB",
          BPLId: LABASA_BRANCH,
        },
      ],
    );

    const sapPayload = await assign({ warehouseCode: "WH-LAB" });

    expect(sapPayload).not.toHaveProperty("Series");
  });

  it("sends no Series when the document has no warehouse", async () => {
    fakeTenantDb(
      [],
      [
        {
          ObjectCode: PO_OBJECT,
          Remark: "Labasa",
          Series: 11,
          SeriesName: "PO-LAB",
          BPLId: LABASA_BRANCH,
        },
      ],
    );

    const sapPayload = await assign({ warehouseCode: null });

    expect(sapPayload).not.toHaveProperty("Series");
  });

  it("sends no Series when the warehouse is unknown", async () => {
    fakeTenantDb(
      [{ Location: "Labasa", WarehouseCode: "WH-LAB" }],
      [
        {
          ObjectCode: PO_OBJECT,
          Remark: "Labasa",
          Series: 11,
          SeriesName: "PO-LAB",
          BPLId: LABASA_BRANCH,
        },
      ],
    );

    const sapPayload = await assign({ warehouseCode: "WH-HO" });

    expect(sapPayload).not.toHaveProperty("Series");
  });

  it("sends no Series (and does not fail posting) when the location lookup fails", async () => {
    executeTenantQuery.mockRejectedValue(new Error("HANA connection lost"));

    const sapPayload = await assign({ warehouseCode: "WH-LAB" });

    expect(sapPayload).not.toHaveProperty("Series");
  });

  it("sends no Series when the location's series belongs to another branch", async () => {
    fakeTenantDb(
      [{ Location: "Labasa", WarehouseCode: "WH-LAB" }],
      [
        {
          ObjectCode: PO_OBJECT,
          Remark: "Labasa",
          Series: 11,
          SeriesName: "PO-LAB",
          BPLId: LABASA_BRANCH,
        },
      ],
    );

    const sapPayload = await assign({ branchId: SUVA_BRANCH, warehouseCode: "WH-LAB" });

    expect(sapPayload).not.toHaveProperty("Series");
  });

  it("sends no Series when the document has no branch", async () => {
    fakeTenantDb(
      [{ Location: "Labasa", WarehouseCode: "WH-LAB" }],
      [
        {
          ObjectCode: PO_OBJECT,
          Remark: "Labasa",
          Series: 11,
          SeriesName: "PO-LAB",
          BPLId: LABASA_BRANCH,
        },
      ],
    );

    const sapPayload = await assign({ branchId: null, warehouseCode: "WH-LAB" });

    expect(sapPayload).not.toHaveProperty("Series");
  });

  it("sends no Series (and does not fail posting) when NNM1 has no branch column", async () => {
    executeTenantQuery.mockImplementation(async (_db: string, sql: string) => {
      if (sql.includes("OWHS")) {
        return [{ Location: "Labasa" }];
      }
      throw new Error('invalid column name: "BPLId"');
    });

    const sapPayload = await assign({ warehouseCode: "WH-LAB" });

    expect(sapPayload).not.toHaveProperty("Series");
  });

  it("sends no Series when the warehouse has no SAP location set", async () => {
    fakeTenantDb(
      [{ Location: null, WarehouseCode: "WH-LAB" }],
      [
        {
          ObjectCode: PO_OBJECT,
          Remark: "Labasa",
          Series: 11,
          SeriesName: "PO-LAB",
          BPLId: LABASA_BRANCH,
        },
      ],
    );

    const sapPayload = await assign({ warehouseCode: "WH-LAB" });

    expect(sapPayload).not.toHaveProperty("Series");
  });
});
