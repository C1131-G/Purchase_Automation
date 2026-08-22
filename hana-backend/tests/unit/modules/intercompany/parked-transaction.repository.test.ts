import { describe, expect, it } from "vitest";

import { createParkedTransactionRepository } from "@/modules/intercompany/flows/flow-2-po-to-ar-invoice/03-park-transaction/parked-transaction.repository";
import { buildPosParkedInvoiceData } from "@/modules/intercompany/flows/flow-2-po-to-ar-invoice/03-park-transaction/parked-invoice.payload";
import { createCompanyQueries } from "@/modules/intercompany/config/company/company.queries";
import {
  createMemoryDb,
  createMemorySqlClient,
  seedMemoryCompanyGraph,
} from "@/modules/intercompany/testing/memory-sql";

describe("ParkedTransactionRepository", () => {
  it.each([
    ["YES", true],
    [" yes ", true],
    ["NO", false],
    ["unexpected", false],
  ])("normalizes IC_COMPANY.PARK=%s", async (parkValue, expected) => {
    const db = createMemoryDb();
    seedMemoryCompanyGraph(db);
    db.tables.IC_COMPANY[1].PARK = parkValue;
    const company = await createCompanyQueries(createMemorySqlClient(db)).getById(2);
    expect(company?.park).toBe(expected);
  });

  it("builds literal POS invoice data with seller SQ base links", () => {
    const data = buildPosParkedInvoiceData({
      buyerCompanyName: "Buyer Ltd",
      customerCode: "C-10",
      poDocEntry: 500,
      poDocNum: 100050,
      portalCreatedBy: "Raj",
      salesPersonCode: 15,
      snapshot: {
        cardCode: "C-10",
        cardName: "Buyer Ltd",
        docEntry: 810,
        docNum: 200810,
        salesPersonCode: 15,
        documentLines: [
          {
            DiscountPercent: 0,
            GrossTotal: 590,
            ItemCode: "ITEM-1",
            ItemDescription: "Example Item",
            LineNum: 0,
            Quantity: 5,
            TaxPercentagePerRow: 18,
            UnitPrice: 100,
            VatGroup: "OUTPUT",
            WarehouseCode: "WH-02",
          },
        ],
      },
      transactionId: "IC-PO-1-500",
    });

    expect(data).toMatchObject({
      customer: { CardCode: "C-10", CardName: "Buyer Ltd" },
      parkedTransaction: {
        TotalAmount: 590,
        parkReason: "IC PO 100050 awaiting cashier processing",
      },
      salesHeader: { SalesPersonCode: 15 },
      salesItems: [
        {
          BaseEntry: 810,
          BaseLine: 0,
          BaseType: 23,
          ItemCode: "ITEM-1",
          Quantity: 5,
          TotalPriceWithTax: 590,
          WhsCode: "WH-02",
        },
      ],
      transactionID: "IC-PO-1-500",
    });
  });
  it("resolves the only store covering every warehouse and selects its lowest counter", async () => {
    const repository = createParkedTransactionRepository({
      query: async (_dbName, sql) => {
        if (sql.includes('FROM "StoreWarehouses"')) {
          return [
            {
              CounterCode: "C-9",
              Location: "LOC-2",
              StoreCounterId: 9,
              StoreId: 2,
              UserId: 19,
              WarehouseCode: "W1",
            },
            {
              CounterCode: "C-4",
              Location: "LOC-2",
              StoreCounterId: 4,
              StoreId: 2,
              UserId: 14,
              WarehouseCode: "W1",
            },
            {
              CounterCode: "C-4",
              Location: "LOC-2",
              StoreCounterId: 4,
              StoreId: 2,
              UserId: 14,
              WarehouseCode: "W2",
            },
          ];
        }
        return [];
      },
    });

    await expect(repository.resolvePosContext("SELLER_DB", ["W1", "W2"])).resolves.toEqual({
      counterCode: "C-4",
      storeCounterId: 4,
      storeId: 2,
      storeLocation: "LOC-2",
      userId: 14,
    });
  });

  it("rejects ambiguous stores", async () => {
    const repository = createParkedTransactionRepository({
      query: async () => [
        { CounterCode: "A", Location: "L1", StoreCounterId: 1, StoreId: 1, WarehouseCode: "W1" },
        { CounterCode: "B", Location: "L2", StoreCounterId: 2, StoreId: 2, WarehouseCode: "W1" },
      ],
    });

    await expect(repository.resolvePosContext("SELLER_DB", ["W1"])).rejects.toThrow(
      "exactly one POS store",
    );
  });

  it("reuses an existing deterministic transaction instead of inserting a duplicate", async () => {
    const statements: string[] = [];
    const repository = createParkedTransactionRepository({
      query: async (_dbName, sql) => {
        statements.push(sql);
        if (sql.includes('FROM "ParkedTransactions"') && sql.includes("LOCATE")) {
          return [{ ParkedTransactionsId: 44, TransactionRefNum: "7-2208" }];
        }
        throw new Error("insert must not run");
      },
    });

    const result = await repository.createOrReuse({
      data: { transactionID: "IC-PO-1-500" },
      dbName: "SELLER_DB",
      pos: {
        counterCode: "C-4",
        storeCounterId: 4,
        storeId: 2,
        storeLocation: "LOC-2",
        userId: 14,
      },
      transactionId: "IC-PO-1-500",
      userName: "Raj",
    });

    expect(result).toEqual({ parkedTransactionId: 44, reused: true, transactionRefNum: "7-2208" });
    expect(statements).toHaveLength(1);
  });

  it("inserts parameterized POS metadata and reloads the generated row", async () => {
    const calls: Array<{ sql: string; parameters: unknown[] }> = [];
    let lookupCount = 0;
    const repository = createParkedTransactionRepository({
      query: async (_dbName, sql, parameters = []) => {
        calls.push({ parameters, sql });
        if (sql.includes("LOCATE")) {
          lookupCount += 1;
          return lookupCount === 1
            ? []
            : [{ ParkedTransactionsId: 45, TransactionRefNum: "7-2208" }];
        }
        if (sql.includes('SELECT TOP 1 "NextRefNum"')) return [{ NextRefNum: 7 }];
        if (sql.includes('INSERT INTO "ParkedTransactions"')) return [];
        throw new Error(`unexpected SQL: ${sql}`);
      },
    });

    const result = await repository.createOrReuse({
      data: { transactionID: "IC-PO-1-501" },
      dbName: "SELLER_DB",
      pos: {
        counterCode: "C-4",
        storeCounterId: 4,
        storeId: 2,
        storeLocation: "LOC-2",
        userId: 14,
      },
      transactionId: "IC-PO-1-501",
      userName: "Raj",
    });

    const insert = calls.find((call) => call.sql.includes('INSERT INTO "ParkedTransactions"'));
    expect(insert?.parameters).toEqual([
      "INVOICE",
      14,
      "Raj",
      2,
      "LOC-2",
      4,
      "C-4",
      expect.stringMatching(/^7-\d{4}$/),
      8,
      JSON.stringify({ transactionID: "IC-PO-1-501" }),
    ]);
    expect(result).toMatchObject({ parkedTransactionId: 45, reused: false });
  });
});
