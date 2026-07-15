import { asc, desc, eq, sql } from "drizzle-orm";

import { attachments } from "@/db/schema/attachments";
import { goodsReceiptLines } from "@/db/schema/goods-receipt-lines";
import { goodsReceipts } from "@/db/schema/goods-receipts";
import type { LooseDb, LooseWhere, LooseOrderBy, LooseValues } from "@/types/db.types";

export const goodsReceiptRepository = {
  async findList(
    db: LooseDb,
    where: LooseWhere,
    orderBy: LooseOrderBy,
    limit: number,
    offset: number,
  ) {
    return db
      .select()
      .from(goodsReceipts)
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);
  },

  async countList(db: LooseDb, where: LooseWhere): Promise<number> {
    const [result] = await db
      .select({ total: sql<number>`count(*)` })
      .from(goodsReceipts)
      .where(where);
    return Number(result?.total || 0);
  },

  async findById(db: LooseDb, id: number) {
    const [row] = await db.select().from(goodsReceipts).where(eq(goodsReceipts.id, id)).limit(1);
    return row || null;
  },

  async findByDocNum(db: LooseDb, docNum: number) {
    const [row] = await db
      .select()
      .from(goodsReceipts)
      .where(eq(goodsReceipts.docNum, docNum))
      .limit(1);
    return row || null;
  },

  async findLines(db: LooseDb, docEntry: number) {
    return db
      .select()
      .from(goodsReceiptLines)
      .where(eq(goodsReceiptLines.docEntry, docEntry))
      .orderBy(asc(goodsReceiptLines.lineNum));
  },

  async findAttachments(db: LooseDb, absEntry: number) {
    return db.select().from(attachments).where(eq(attachments.absEntry, absEntry));
  },

  async findDocNums(db: LooseDb, search: string | undefined, limit: number) {
    return db
      .select({ docNum: goodsReceipts.docNum })
      .from(goodsReceipts)
      .where(search ? sql`CAST(${goodsReceipts.docNum} AS TEXT) LIKE ${`%${search}%`}` : undefined)
      .limit(limit)
      .orderBy(desc(goodsReceipts.docNum));
  },

  async insertHeader(db: LooseDb, values: LooseValues) {
    const [row] = await db.insert(goodsReceipts).values(values).returning();
    return row;
  },

  async updateHeader(db: LooseDb, id: number, values: LooseValues) {
    return db.update(goodsReceipts).set(values).where(eq(goodsReceipts.id, id));
  },

  async insertLines(db: LooseDb, lines: LooseValues[]) {
    return db.insert(goodsReceiptLines).values(lines);
  },

  async insertAttachments(db: LooseDb, rows: LooseValues[]) {
    return db.insert(attachments).values(rows);
  },

  async deleteAttachments(db: LooseDb, absEntry: number) {
    return db.delete(attachments).where(eq(attachments.absEntry, absEntry));
  },
};
