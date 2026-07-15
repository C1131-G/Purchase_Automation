import { asc, desc, eq, sql } from "drizzle-orm";

import { purchaseQuotationLines } from "@/db/schema/purchase-quotation-lines";
import { purchaseQuotations } from "@/db/schema/purchase-quotations";
import type { LooseDb, LooseWhere, LooseOrderBy, LooseValues } from "@/types/db.types";

export const purchaseQuotationRepository = {
  async findList(
    db: LooseDb,
    where: LooseWhere,
    orderBy: LooseOrderBy,
    limit: number,
    offset: number,
  ) {
    return db
      .select()
      .from(purchaseQuotations)
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);
  },

  async countList(db: LooseDb, where: LooseWhere): Promise<number> {
    const [result] = await db
      .select({ total: sql<number>`count(*)` })
      .from(purchaseQuotations)
      .where(where);
    return Number(result?.total || 0);
  },

  async findById(db: LooseDb, id: number) {
    const [row] = await db
      .select()
      .from(purchaseQuotations)
      .where(eq(purchaseQuotations.id, id))
      .limit(1);
    return row || null;
  },

  async findByDocNum(db: LooseDb, docNum: number) {
    const [row] = await db
      .select()
      .from(purchaseQuotations)
      .where(eq(purchaseQuotations.docNum, docNum))
      .limit(1);
    return row || null;
  },

  async findLines(db: LooseDb, docEntry: number) {
    return db
      .select()
      .from(purchaseQuotationLines)
      .where(eq(purchaseQuotationLines.docEntry, docEntry))
      .orderBy(asc(purchaseQuotationLines.lineNum));
  },

  async findDocNums(db: LooseDb, search: string | undefined, limit: number) {
    return db
      .select({ docNum: purchaseQuotations.docNum })
      .from(purchaseQuotations)
      .where(
        search ? sql`CAST(${purchaseQuotations.docNum} AS TEXT) LIKE ${`%${search}%`}` : undefined,
      )
      .limit(limit)
      .orderBy(desc(purchaseQuotations.docNum));
  },

  async insertHeader(db: LooseDb, values: LooseValues) {
    const [row] = await db.insert(purchaseQuotations).values(values).returning();
    return row;
  },

  async updateHeader(db: LooseDb, id: number, values: LooseValues) {
    return db.update(purchaseQuotations).set(values).where(eq(purchaseQuotations.id, id));
  },

  async deleteLines(db: LooseDb, docEntry: number) {
    return db.delete(purchaseQuotationLines).where(eq(purchaseQuotationLines.docEntry, docEntry));
  },

  async insertLines(db: LooseDb, lines: LooseValues[]) {
    return db.insert(purchaseQuotationLines).values(lines);
  },
};
