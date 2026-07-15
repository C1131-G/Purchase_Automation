import { asc, desc, eq, sql } from "drizzle-orm";

import { arInvoiceLines } from "@/db/schema/ar-invoice-lines";
import { arInvoices } from "@/db/schema/ar-invoices";
import type { LooseDb, LooseWhere, LooseOrderBy, LooseValues } from "@/types/db.types";

export const arInvoiceRepository = {
  async findList(
    db: LooseDb,
    where: LooseWhere,
    orderBy: LooseOrderBy,
    limit: number,
    offset: number,
  ) {
    return db.select().from(arInvoices).where(where).orderBy(orderBy).limit(limit).offset(offset);
  },

  async countList(db: LooseDb, where: LooseWhere): Promise<number> {
    const [result] = await db
      .select({ total: sql<number>`count(*)` })
      .from(arInvoices)
      .where(where);
    return Number(result?.total || 0);
  },

  async findById(db: LooseDb, id: number) {
    const [row] = await db.select().from(arInvoices).where(eq(arInvoices.id, id)).limit(1);
    return row || null;
  },

  async findByDocNum(db: LooseDb, docNum: number) {
    const [row] = await db.select().from(arInvoices).where(eq(arInvoices.docNum, docNum)).limit(1);
    return row || null;
  },

  async findLines(db: LooseDb, docEntry: number) {
    return db
      .select()
      .from(arInvoiceLines)
      .where(eq(arInvoiceLines.docEntry, docEntry))
      .orderBy(asc(arInvoiceLines.lineNum));
  },

  async findLineBaseEntries(db: LooseDb, docEntry: number) {
    return db
      .select({
        baseEntry: arInvoiceLines.baseEntry,
        baseType: arInvoiceLines.baseType,
      })
      .from(arInvoiceLines)
      .where(eq(arInvoiceLines.docEntry, docEntry));
  },

  async findDocNums(db: LooseDb, search: string | undefined, limit: number) {
    return db
      .select({ docNum: arInvoices.docNum })
      .from(arInvoices)
      .where(search ? sql`CAST(${arInvoices.docNum} AS TEXT) LIKE ${`%${search}%`}` : undefined)
      .limit(limit)
      .orderBy(desc(arInvoices.docNum));
  },

  async insertHeader(db: LooseDb, values: LooseValues) {
    const [row] = await db.insert(arInvoices).values(values).returning();
    return row;
  },

  async updateHeader(db: LooseDb, id: number, values: LooseValues) {
    return db.update(arInvoices).set(values).where(eq(arInvoices.id, id));
  },

  async deleteLines(db: LooseDb, docEntry: number) {
    return db.delete(arInvoiceLines).where(eq(arInvoiceLines.docEntry, docEntry));
  },

  async insertLines(db: LooseDb, lines: LooseValues[]) {
    return db.insert(arInvoiceLines).values(lines);
  },
};
