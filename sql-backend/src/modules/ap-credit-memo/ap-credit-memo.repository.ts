import { asc, desc, eq, sql } from "drizzle-orm";

import { apCreditMemoLines } from "@/db/schema/ap-credit-memo-lines";
import { apCreditMemos } from "@/db/schema/ap-credit-memos";
import type { LooseDb, LooseWhere, LooseOrderBy, LooseValues } from "@/types/db.types";

export const apCreditMemoRepository = {
  async findList(
    db: LooseDb,
    where: LooseWhere,
    orderBy: LooseOrderBy,
    limit: number,
    offset: number,
  ) {
    return db
      .select()
      .from(apCreditMemos)
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);
  },

  async countList(db: LooseDb, where: LooseWhere): Promise<number> {
    const [result] = await db
      .select({ total: sql<number>`count(*)` })
      .from(apCreditMemos)
      .where(where);
    return Number(result?.total || 0);
  },

  async findById(db: LooseDb, id: number) {
    const [row] = await db.select().from(apCreditMemos).where(eq(apCreditMemos.id, id)).limit(1);
    return row || null;
  },

  async findByDocNum(db: LooseDb, docNum: number) {
    const [row] = await db
      .select()
      .from(apCreditMemos)
      .where(eq(apCreditMemos.docNum, docNum))
      .limit(1);
    return row || null;
  },

  async findLines(db: LooseDb, docEntry: number) {
    return db
      .select()
      .from(apCreditMemoLines)
      .where(eq(apCreditMemoLines.docEntry, docEntry))
      .orderBy(asc(apCreditMemoLines.lineNum));
  },

  async findLineBaseEntries(db: LooseDb, docEntry: number) {
    return db
      .select({
        baseEntry: apCreditMemoLines.baseEntry,
        baseType: apCreditMemoLines.baseType,
      })
      .from(apCreditMemoLines)
      .where(eq(apCreditMemoLines.docEntry, docEntry));
  },

  async findDocNums(db: LooseDb, search: string | undefined, limit: number) {
    return db
      .select({ docNum: apCreditMemos.docNum })
      .from(apCreditMemos)
      .where(search ? sql`CAST(${apCreditMemos.docNum} AS TEXT) LIKE ${`%${search}%`}` : undefined)
      .limit(limit)
      .orderBy(desc(apCreditMemos.docNum));
  },

  async insertHeader(db: LooseDb, values: LooseValues) {
    const [row] = await db.insert(apCreditMemos).values(values).returning();
    return row;
  },

  async updateHeader(db: LooseDb, id: number, values: LooseValues) {
    return db.update(apCreditMemos).set(values).where(eq(apCreditMemos.id, id));
  },

  async deleteLines(db: LooseDb, docEntry: number) {
    return db.delete(apCreditMemoLines).where(eq(apCreditMemoLines.docEntry, docEntry));
  },

  async insertLines(db: LooseDb, lines: LooseValues[]) {
    return db.insert(apCreditMemoLines).values(lines);
  },
};
