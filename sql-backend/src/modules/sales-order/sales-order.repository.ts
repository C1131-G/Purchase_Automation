import { asc, desc, eq, sql } from "drizzle-orm";

import { salesOrderLines } from "@/db/schema/sales-order-lines";
import { salesOrders } from "@/db/schema/sales-orders";
import type { LooseDb, LooseWhere, LooseOrderBy, LooseValues } from "@/types/db.types";

export const salesOrderRepository = {
  async findList(
    db: LooseDb,
    where: LooseWhere,
    orderBy: LooseOrderBy,
    limit: number,
    offset: number,
  ) {
    return db.select().from(salesOrders).where(where).orderBy(orderBy).limit(limit).offset(offset);
  },

  async countList(db: LooseDb, where: LooseWhere): Promise<number> {
    const [result] = await db
      .select({ total: sql<number>`count(*)` })
      .from(salesOrders)
      .where(where);
    return Number(result?.total || 0);
  },

  async findById(db: LooseDb, id: number) {
    const [row] = await db.select().from(salesOrders).where(eq(salesOrders.id, id)).limit(1);
    return row || null;
  },

  async findByDocNum(db: LooseDb, docNum: number) {
    const [row] = await db
      .select()
      .from(salesOrders)
      .where(eq(salesOrders.docNum, docNum))
      .limit(1);
    return row || null;
  },

  async findLines(db: LooseDb, docEntry: number) {
    return db
      .select()
      .from(salesOrderLines)
      .where(eq(salesOrderLines.docEntry, docEntry))
      .orderBy(asc(salesOrderLines.lineNum));
  },

  async findLineBaseEntries(db: LooseDb, docEntry: number) {
    return db
      .select({ baseEntry: salesOrderLines.baseEntry })
      .from(salesOrderLines)
      .where(eq(salesOrderLines.docEntry, docEntry));
  },

  async findDocNums(db: LooseDb, search: string | undefined, limit: number) {
    return db
      .select({ docNum: salesOrders.docNum })
      .from(salesOrders)
      .where(search ? sql`CAST(${salesOrders.docNum} AS TEXT) LIKE ${`%${search}%`}` : undefined)
      .limit(limit)
      .orderBy(desc(salesOrders.docNum));
  },

  async insertHeader(db: LooseDb, values: LooseValues) {
    const [row] = await db.insert(salesOrders).values(values).returning();
    return row;
  },

  async updateHeader(db: LooseDb, id: number, values: LooseValues) {
    return db.update(salesOrders).set(values).where(eq(salesOrders.id, id));
  },

  async deleteLines(db: LooseDb, docEntry: number) {
    return db.delete(salesOrderLines).where(eq(salesOrderLines.docEntry, docEntry));
  },

  async insertLines(db: LooseDb, lines: LooseValues[]) {
    return db.insert(salesOrderLines).values(lines);
  },
};
