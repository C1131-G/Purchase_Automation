import { executeTenantQuery } from "@/db/tenant-query";

import type {
  ParkedTransactionResult,
  PosParkContext,
  PosParkedInvoiceData,
} from "./parked-transaction.types";

type TenantQuery = (dbName: string, sql: string, parameters?: unknown[]) => Promise<unknown>;
type Row = Record<string, unknown>;

const rowsFrom = (value: unknown): Row[] => (Array.isArray(value) ? (value as Row[]) : []);
const numberFrom = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const valueFrom = (row: Row, pascal: string, camel: string): unknown => row[pascal] ?? row[camel];

export type ParkedTransactionRepository = {
  resolvePosContext: (dbName: string, warehouseCodes: string[]) => Promise<PosParkContext>;
  createOrReuse: (input: {
    data: PosParkedInvoiceData | { transactionID: string };
    dbName: string;
    pos: PosParkContext;
    transactionId: string;
    userName: string;
  }) => Promise<ParkedTransactionResult>;
  updateData: (
    dbName: string,
    parkedTransactionId: number,
    data: PosParkedInvoiceData,
  ) => Promise<boolean>;
};

export const createParkedTransactionRepository = (deps?: {
  query?: TenantQuery;
}): ParkedTransactionRepository => {
  const query = deps?.query ?? executeTenantQuery;

  const findByTransactionId = async (
    dbName: string,
    transactionId: string,
  ): Promise<ParkedTransactionResult | null> => {
    const token = `"transactionID":"${transactionId}"`;
    const rows = rowsFrom(
      await query(
        dbName,
        `SELECT TOP 1 "ParkedTransactionsId", "TransactionRefNum"
           FROM "ParkedTransactions"
          WHERE LOCATE(?, "Data") > 0
          ORDER BY "ParkedTransactionsId" DESC`,
        [token],
      ),
    );
    const row = rows[0];
    const parkedTransactionId = row
      ? numberFrom(valueFrom(row, "ParkedTransactionsId", "parkedTransactionId"))
      : null;
    if (!row || parkedTransactionId == null) return null;
    return {
      parkedTransactionId,
      reused: true,
      transactionRefNum: String(valueFrom(row, "TransactionRefNum", "transactionRefNum") ?? ""),
    };
  };

  return {
    resolvePosContext: async (dbName, warehouseCodes) => {
      const distinctCodes = [...new Set(warehouseCodes.map((code) => code.trim()).filter(Boolean))];
      if (distinctCodes.length === 0) {
        throw new Error("IC park requires at least one seller SQ warehouse");
      }
      const placeholders = distinctCodes.map(() => "?").join(", ");
      const rows = rowsFrom(
        await query(
          dbName,
          `SELECT sw."WarehouseCode", s."StoreId", s."Location",
                  c."StoreCounterId", c."CounterCode", c."UserId"
             FROM "StoreWarehouses" sw
             JOIN "Stores" s ON s."StoreId" = sw."StoreId"
             LEFT JOIN "StoreCounters" c ON c."StoreId" = s."StoreId"
            WHERE sw."WarehouseCode" IN (${placeholders})`,
          distinctCodes,
        ),
      );

      const stores = new Map<number, { codes: Set<string>; rows: Row[] }>();
      for (const row of rows) {
        const storeId = numberFrom(valueFrom(row, "StoreId", "storeId"));
        if (storeId == null) continue;
        const current = stores.get(storeId) ?? { codes: new Set<string>(), rows: [] };
        current.codes.add(String(valueFrom(row, "WarehouseCode", "warehouseCode") ?? ""));
        current.rows.push(row);
        stores.set(storeId, current);
      }
      const matches = [...stores.entries()].filter(([, value]) =>
        distinctCodes.every((code) => value.codes.has(code)),
      );
      if (matches.length !== 1) {
        throw new Error(
          `IC park requires exactly one POS store covering seller warehouses (${distinctCodes.join(", ")}); found ${matches.length}`,
        );
      }
      const [storeId, store] = matches[0];
      const counterRows = store.rows
        .filter((row) => numberFrom(valueFrom(row, "StoreCounterId", "storeCounterId")) != null)
        .sort(
          (left, right) =>
            Number(valueFrom(left, "StoreCounterId", "storeCounterId")) -
            Number(valueFrom(right, "StoreCounterId", "storeCounterId")),
        );
      const selected = counterRows[0];
      if (!selected) throw new Error(`IC park POS store ${storeId} has no counter`);
      const storeCounterId = Number(valueFrom(selected, "StoreCounterId", "storeCounterId"));
      const counterCode = String(valueFrom(selected, "CounterCode", "counterCode") ?? "").trim();
      const storeLocation = String(valueFrom(selected, "Location", "location") ?? "").trim();
      if (!counterCode || !storeLocation) {
        throw new Error(`IC park POS store ${storeId} has incomplete location/counter metadata`);
      }
      return {
        counterCode,
        storeCounterId,
        storeId,
        storeLocation,
        userId: numberFrom(valueFrom(selected, "UserId", "userId")),
      };
    },

    createOrReuse: async (input) => {
      const existing = await findByTransactionId(input.dbName, input.transactionId);
      if (existing) return existing;

      const latestRows = rowsFrom(
        await query(
          input.dbName,
          `SELECT TOP 1 "NextRefNum" FROM "ParkedTransactions" ORDER BY "NextRefNum" DESC`,
        ),
      );
      const latest = numberFrom(valueFrom(latestRows[0] ?? {}, "NextRefNum", "nextRefNum"));
      const nextRefNum = latest == null ? 1 : latest;
      const now = new Date();
      const day = String(now.getDate()).padStart(2, "0");
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const transactionRefNum = `${nextRefNum}-${day}${month}`;
      try {
        await query(
          input.dbName,
          `INSERT INTO "ParkedTransactions"
          ("TransactionType", "UserId", "UserName", "StoreId", "StoreLocation",
           "StoreCounterId", "CounterCode", "TransactionRefNum", "NextRefNum", "Data", "ParkedDateTime")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            "INVOICE",
            input.pos.userId,
            input.userName,
            input.pos.storeId,
            input.pos.storeLocation,
            input.pos.storeCounterId,
            input.pos.counterCode,
            transactionRefNum,
            nextRefNum + 1,
            JSON.stringify(input.data),
          ],
        );
      } catch (error: unknown) {
        // A concurrent retry may have inserted the same deterministic transaction.
        const concurrent = await findByTransactionId(input.dbName, input.transactionId);
        if (concurrent) return concurrent;
        throw error;
      }
      const inserted = await findByTransactionId(input.dbName, input.transactionId);
      if (!inserted) throw new Error("IC park insert succeeded but row could not be reloaded");
      return { ...inserted, reused: false, transactionRefNum };
    },

    updateData: async (dbName, parkedTransactionId, data) => {
      const result = rowsFrom(
        await query(
          dbName,
          `UPDATE "ParkedTransactions" SET "Data" = ? WHERE "ParkedTransactionsId" = ?`,
          [JSON.stringify(data), parkedTransactionId],
        ),
      );
      if (result.length > 0) return true;
      const rows = rowsFrom(
        await query(
          dbName,
          `SELECT TOP 1 "ParkedTransactionsId" FROM "ParkedTransactions" WHERE "ParkedTransactionsId" = ?`,
          [parkedTransactionId],
        ),
      );
      return rows.length > 0;
    },
  };
};

export const parkedTransactionRepository = createParkedTransactionRepository();
