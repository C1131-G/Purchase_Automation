import { asc, desc, eq, sql } from "drizzle-orm";

import { salesQuotationLines } from "@/db/schema/sales-quotation-lines";
import { salesQuotations } from "@/db/schema/sales-quotations";
import type { LooseDb, LooseWhere, LooseOrderBy, LooseValues } from "@/types/db.types";

export const salesQuotationRepository = {
  async findList(
    db: LooseDb,
    where: LooseWhere,
    orderBy: LooseOrderBy,
    limit: number,
    offset: number,
  ) {
    return db
      .select()
      .from(salesQuotations)
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);
  },

  async countList(db: LooseDb, where: LooseWhere): Promise<number> {
    const [result] = await db
      .select({ total: sql<number>`count(*)` })
      .from(salesQuotations)
      .where(where);
    return Number(result?.total || 0);
  },

  async findById(db: LooseDb, id: number) {
    const [row] = await db
      .select()
      .from(salesQuotations)
      .where(eq(salesQuotations.id, id))
      .limit(1);
    return row || null;
  },

  async findByDocNum(db: LooseDb, docNum: number) {
    const [row] = await db
      .select()
      .from(salesQuotations)
      .where(eq(salesQuotations.docNum, docNum))
      .limit(1);
    return row || null;
  },

  async findLines(db: LooseDb, docEntry: number) {
    return db
      .select()
      .from(salesQuotationLines)
      .where(eq(salesQuotationLines.docEntry, docEntry))
      .orderBy(asc(salesQuotationLines.lineNum));
  },

  async findDocNums(db: LooseDb, search: string | undefined, limit: number) {
    return db
      .select({ docNum: salesQuotations.docNum })
      .from(salesQuotations)
      .where(
        search ? sql`CAST(${salesQuotations.docNum} AS TEXT) LIKE ${`%${search}%`}` : undefined,
      )
      .limit(limit)
      .orderBy(desc(salesQuotations.docNum));
  },

  async insertHeader(db: LooseDb, values: LooseValues) {
    const [row] = await db.insert(salesQuotations).values(values).returning();
    return row;
  },

  async updateHeader(db: LooseDb, id: number, values: LooseValues) {
    return db.update(salesQuotations).set(values).where(eq(salesQuotations.id, id));
  },

  async deleteLines(db: LooseDb, docEntry: number) {
    return db.delete(salesQuotationLines).where(eq(salesQuotationLines.docEntry, docEntry));
  },

  async insertLines(db: LooseDb, lines: LooseValues[]) {
    return db.insert(salesQuotationLines).values(lines);
  },
};
