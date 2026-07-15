import { asc, desc, eq, sql } from "drizzle-orm";

import { inventoryTransferRequestLines } from "@/db/schema/inventory-transfer-request-lines";
import { inventoryTransferRequests } from "@/db/schema/inventory-transfer-requests";
import type { LooseDb, LooseWhere, LooseOrderBy, LooseValues } from "@/types/db.types";

export const transferRequestRepository = {
  async findList(
    db: LooseDb,
    where: LooseWhere,
    orderBy: LooseOrderBy,
    limit: number,
    offset: number,
  ) {
    return db
      .select()
      .from(inventoryTransferRequests)
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);
  },

  async countList(db: LooseDb, where: LooseWhere): Promise<number> {
    const [result] = await db
      .select({ total: sql<number>`count(*)` })
      .from(inventoryTransferRequests)
      .where(where);
    return Number(result?.total || 0);
  },

  async findById(db: LooseDb, id: number) {
    const [row] = await db
      .select()
      .from(inventoryTransferRequests)
      .where(eq(inventoryTransferRequests.id, id))
      .limit(1);
    return row || null;
  },

  async findByDocNum(db: LooseDb, docNum: number) {
    const [row] = await db
      .select()
      .from(inventoryTransferRequests)
      .where(eq(inventoryTransferRequests.docNum, docNum))
      .limit(1);
    return row || null;
  },

  async findLines(db: LooseDb, docEntry: number) {
    return db
      .select()
      .from(inventoryTransferRequestLines)
      .where(eq(inventoryTransferRequestLines.docEntry, docEntry))
      .orderBy(asc(inventoryTransferRequestLines.lineNum));
  },

  async findDocNums(db: LooseDb, search: string | undefined, limit: number) {
    return db
      .select({ docNum: inventoryTransferRequests.docNum })
      .from(inventoryTransferRequests)
      .where(
        search
          ? sql`CAST(${inventoryTransferRequests.docNum} AS TEXT) LIKE ${`%${search}%`}`
          : undefined,
      )
      .limit(limit)
      .orderBy(desc(inventoryTransferRequests.docNum));
  },

  async insertHeader(db: LooseDb, values: LooseValues) {
    const [row] = await db.insert(inventoryTransferRequests).values(values).returning();
    return row;
  },

  async insertLines(db: LooseDb, lines: LooseValues[]) {
    return db.insert(inventoryTransferRequestLines).values(lines);
  },
};
