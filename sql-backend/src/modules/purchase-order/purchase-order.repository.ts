import { asc, desc, eq, sql } from "drizzle-orm";

import { purchaseOrderLines } from "@/db/schema/purchase-order-lines";
import { purchaseOrders } from "@/db/schema/purchase-orders";
import type { LooseDb, LooseWhere, LooseOrderBy, LooseValues } from "@/types/db.types";

export const purchaseOrderRepository = {
  async findList(
    db: LooseDb,
    where: LooseWhere,
    orderBy: LooseOrderBy,
    limit: number,
    offset: number,
  ) {
    return db
      .select()
      .from(purchaseOrders)
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);
  },

  async countList(db: LooseDb, where: LooseWhere): Promise<number> {
    const [result] = await db
      .select({ total: sql<number>`count(*)` })
      .from(purchaseOrders)
      .where(where);
    return Number(result?.total || 0);
  },

  async findById(db: LooseDb, id: number) {
    const [row] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)).limit(1);
    return row || null;
  },

  async findByDocNum(db: LooseDb, docNum: number) {
    const [row] = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.docNum, docNum))
      .limit(1);
    return row || null;
  },

  async findLines(db: LooseDb, docEntry: number) {
    return db
      .select()
      .from(purchaseOrderLines)
      .where(eq(purchaseOrderLines.docEntry, docEntry))
      .orderBy(asc(purchaseOrderLines.lineNum));
  },

  async findLineBaseEntries(db: LooseDb, docEntry: number) {
    return db
      .select({ baseEntry: purchaseOrderLines.baseEntry })
      .from(purchaseOrderLines)
      .where(eq(purchaseOrderLines.docEntry, docEntry));
  },

  async findDocNums(db: LooseDb, search: string | undefined, limit: number) {
    return db
      .select({ docNum: purchaseOrders.docNum })
      .from(purchaseOrders)
      .where(search ? sql`CAST(${purchaseOrders.docNum} AS TEXT) LIKE ${`%${search}%`}` : undefined)
      .limit(limit)
      .orderBy(desc(purchaseOrders.docNum));
  },

  async insertHeader(db: LooseDb, values: LooseValues) {
    const [row] = await db.insert(purchaseOrders).values(values).returning();
    return row;
  },

  async updateHeader(db: LooseDb, id: number, values: LooseValues) {
    return db.update(purchaseOrders).set(values).where(eq(purchaseOrders.id, id));
  },

  async deleteLines(db: LooseDb, docEntry: number) {
    return db.delete(purchaseOrderLines).where(eq(purchaseOrderLines.docEntry, docEntry));
  },

  async insertLines(db: LooseDb, lines: LooseValues[]) {
    return db.insert(purchaseOrderLines).values(lines);
  },
};
