import { desc, eq, sql } from "drizzle-orm";

import { incomingPayments } from "@/db/schema/incoming-payments";
import type { LooseDb, LooseWhere, LooseOrderBy, LooseValues } from "@/types/db.types";

export const incomingPaymentRepository = {
  async findList(
    db: LooseDb,
    where: LooseWhere,
    orderBy: LooseOrderBy,
    limit: number,
    offset: number,
  ) {
    return db
      .select()
      .from(incomingPayments)
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);
  },

  async countList(db: LooseDb, where: LooseWhere): Promise<number> {
    const [result] = await db
      .select({ total: sql<number>`count(*)` })
      .from(incomingPayments)
      .where(where);
    return Number(result?.total || 0);
  },

  async findById(db: LooseDb, id: number) {
    const [row] = await db
      .select()
      .from(incomingPayments)
      .where(eq(incomingPayments.id, id))
      .limit(1);
    return row || null;
  },

  async findByDocNum(db: LooseDb, docNum: number) {
    const [row] = await db
      .select()
      .from(incomingPayments)
      .where(eq(incomingPayments.docNum, docNum))
      .limit(1);
    return row || null;
  },

  async findDocNums(db: LooseDb, search: string | undefined, limit: number) {
    return db
      .select({ docNum: incomingPayments.docNum })
      .from(incomingPayments)
      .where(
        search ? sql`CAST(${incomingPayments.docNum} AS TEXT) LIKE ${`%${search}%`}` : undefined,
      )
      .limit(limit)
      .orderBy(desc(incomingPayments.docNum));
  },

  async insert(db: LooseDb, values: LooseValues) {
    const [row] = await db.insert(incomingPayments).values(values).returning();
    return row;
  },

  async update(db: LooseDb, id: number, values: LooseValues) {
    return db.update(incomingPayments).set(values).where(eq(incomingPayments.id, id));
  },

  async delete(db: LooseDb, id: number) {
    return db.delete(incomingPayments).where(eq(incomingPayments.id, id));
  },
};
