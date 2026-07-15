import { desc, eq, sql } from "drizzle-orm";

import { outgoingPayments } from "@/db/schema/outgoing-payments";
import type { LooseDb, LooseWhere, LooseOrderBy, LooseValues } from "@/types/db.types";

export const outgoingPaymentRepository = {
  async findList(
    db: LooseDb,
    where: LooseWhere,
    orderBy: LooseOrderBy,
    limit: number,
    offset: number,
  ) {
    return db
      .select()
      .from(outgoingPayments)
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);
  },

  async countList(db: LooseDb, where: LooseWhere): Promise<number> {
    const [result] = await db
      .select({ total: sql<number>`count(*)` })
      .from(outgoingPayments)
      .where(where);
    return Number(result?.total || 0);
  },

  async findById(db: LooseDb, id: number) {
    const [row] = await db
      .select()
      .from(outgoingPayments)
      .where(eq(outgoingPayments.id, id))
      .limit(1);
    return row || null;
  },

  async findByDocNum(db: LooseDb, docNum: number) {
    const [row] = await db
      .select()
      .from(outgoingPayments)
      .where(eq(outgoingPayments.docNum, docNum))
      .limit(1);
    return row || null;
  },

  async findDocNums(db: LooseDb, search: string | undefined, limit: number) {
    return db
      .select({ docNum: outgoingPayments.docNum })
      .from(outgoingPayments)
      .where(
        search ? sql`CAST(${outgoingPayments.docNum} AS TEXT) LIKE ${`%${search}%`}` : undefined,
      )
      .limit(limit)
      .orderBy(desc(outgoingPayments.docNum));
  },

  async insert(db: LooseDb, values: LooseValues) {
    const [row] = await db.insert(outgoingPayments).values(values).returning();
    return row;
  },

  async update(db: LooseDb, id: number, values: LooseValues) {
    return db.update(outgoingPayments).set(values).where(eq(outgoingPayments.id, id));
  },

  async delete(db: LooseDb, id: number) {
    return db.delete(outgoingPayments).where(eq(outgoingPayments.id, id));
  },
};
