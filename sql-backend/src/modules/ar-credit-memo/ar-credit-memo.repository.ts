import { asc, desc, eq, sql } from "drizzle-orm";

import { arCreditMemoLines } from "@/db/schema/ar-credit-memo-lines";
import { arCreditMemos } from "@/db/schema/ar-credit-memos";
import type { LooseDb, LooseWhere, LooseOrderBy, LooseValues } from "@/types/db.types";

export const arCreditMemoRepository = {
  async findList(
    db: LooseDb,
    where: LooseWhere,
    orderBy: LooseOrderBy,
    limit: number,
    offset: number,
  ) {
    return db
      .select()
      .from(arCreditMemos)
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);
  },

  async countList(db: LooseDb, where: LooseWhere): Promise<number> {
    const [result] = await db
      .select({ total: sql<number>`count(*)` })
      .from(arCreditMemos)
      .where(where);
    return Number(result?.total || 0);
  },

  async findById(db: LooseDb, id: number) {
    const [row] = await db.select().from(arCreditMemos).where(eq(arCreditMemos.id, id)).limit(1);
    return row || null;
  },

  async findByDocNum(db: LooseDb, docNum: number) {
    const [row] = await db
      .select()
      .from(arCreditMemos)
      .where(eq(arCreditMemos.docNum, docNum))
      .limit(1);
    return row || null;
  },

  async findLines(db: LooseDb, docEntry: number) {
    return db
      .select()
      .from(arCreditMemoLines)
      .where(eq(arCreditMemoLines.docEntry, docEntry))
      .orderBy(asc(arCreditMemoLines.lineNum));
  },

  async findLineBaseEntries(db: LooseDb, docEntry: number) {
    return db
      .select({
        baseEntry: arCreditMemoLines.baseEntry,
        baseType: arCreditMemoLines.baseType,
      })
      .from(arCreditMemoLines)
      .where(eq(arCreditMemoLines.docEntry, docEntry));
  },

  async findDocNums(db: LooseDb, search: string | undefined, limit: number) {
    return db
      .select({ docNum: arCreditMemos.docNum })
      .from(arCreditMemos)
      .where(search ? sql`CAST(${arCreditMemos.docNum} AS TEXT) LIKE ${`%${search}%`}` : undefined)
      .limit(limit)
      .orderBy(desc(arCreditMemos.docNum));
  },

  async insertHeader(db: LooseDb, values: LooseValues) {
    const [row] = await db.insert(arCreditMemos).values(values).returning();
    return row;
  },

  async updateHeader(db: LooseDb, id: number, values: LooseValues) {
    return db.update(arCreditMemos).set(values).where(eq(arCreditMemos.id, id));
  },

  async deleteLines(db: LooseDb, docEntry: number) {
    return db.delete(arCreditMemoLines).where(eq(arCreditMemoLines.docEntry, docEntry));
  },

  async insertLines(db: LooseDb, lines: LooseValues[]) {
    return db.insert(arCreditMemoLines).values(lines);
  },
};
