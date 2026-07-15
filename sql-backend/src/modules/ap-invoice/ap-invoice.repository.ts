import { asc, desc, eq, sql } from "drizzle-orm";

import { apInvoiceLines } from "@/db/schema/ap-invoice-lines";
import { apInvoices } from "@/db/schema/ap-invoices";
import type { LooseDb, LooseWhere, LooseOrderBy, LooseValues } from "@/types/db.types";

export const apInvoiceRepository = {
  async findList(
    db: LooseDb,
    where: LooseWhere,
    orderBy: LooseOrderBy,
    limit: number,
    offset: number,
  ) {
    return db.select().from(apInvoices).where(where).orderBy(orderBy).limit(limit).offset(offset);
  },

  async countList(db: LooseDb, where: LooseWhere): Promise<number> {
    const [result] = await db
      .select({ total: sql<number>`count(*)` })
      .from(apInvoices)
      .where(where);
    return Number(result?.total || 0);
  },

  async findById(db: LooseDb, id: number) {
    const [row] = await db.select().from(apInvoices).where(eq(apInvoices.id, id)).limit(1);
    return row || null;
  },

  async findByDocNum(db: LooseDb, docNum: number) {
    const [row] = await db.select().from(apInvoices).where(eq(apInvoices.docNum, docNum)).limit(1);
    return row || null;
  },

  async findLines(db: LooseDb, docEntry: number) {
    return db
      .select()
      .from(apInvoiceLines)
      .where(eq(apInvoiceLines.docEntry, docEntry))
      .orderBy(asc(apInvoiceLines.lineNum));
  },

  async findLineBaseEntries(db: LooseDb, docEntry: number) {
    return db
      .select({
        baseEntry: apInvoiceLines.baseEntry,
        baseType: apInvoiceLines.baseType,
      })
      .from(apInvoiceLines)
      .where(eq(apInvoiceLines.docEntry, docEntry));
  },

  async findDocNums(db: LooseDb, search: string | undefined, limit: number) {
    return db
      .select({ docNum: apInvoices.docNum })
      .from(apInvoices)
      .where(search ? sql`CAST(${apInvoices.docNum} AS TEXT) LIKE ${`%${search}%`}` : undefined)
      .limit(limit)
      .orderBy(desc(apInvoices.docNum));
  },

  async insertHeader(db: LooseDb, values: LooseValues) {
    const [row] = await db.insert(apInvoices).values(values).returning();
    return row;
  },

  async updateHeader(db: LooseDb, id: number, values: LooseValues) {
    return db.update(apInvoices).set(values).where(eq(apInvoices.id, id));
  },

  async deleteLines(db: LooseDb, docEntry: number) {
    return db.delete(apInvoiceLines).where(eq(apInvoiceLines.docEntry, docEntry));
  },

  async insertLines(db: LooseDb, lines: LooseValues[]) {
    return db.insert(apInvoiceLines).values(lines);
  },
};
