import { asc, desc, eq, sql } from "drizzle-orm";

import { grpo } from "@/db/schema/grpo";
import { grpoLines } from "@/db/schema/grpo-lines";
import type { LooseDb, LooseWhere, LooseOrderBy, LooseValues } from "@/types/db.types";

export const grpoRepository = {
  async findList(
    db: LooseDb,
    where: LooseWhere,
    orderBy: LooseOrderBy,
    limit: number,
    offset: number,
  ) {
    return db.select().from(grpo).where(where).orderBy(orderBy).limit(limit).offset(offset);
  },

  async countList(db: LooseDb, where: LooseWhere): Promise<number> {
    const [result] = await db
      .select({ total: sql<number>`count(*)` })
      .from(grpo)
      .where(where);
    return Number(result?.total || 0);
  },

  async findById(db: LooseDb, id: number) {
    const [row] = await db.select().from(grpo).where(eq(grpo.id, id)).limit(1);
    return row || null;
  },

  async findByDocNum(db: LooseDb, docNum: number) {
    const [row] = await db.select().from(grpo).where(eq(grpo.docNum, docNum)).limit(1);
    return row || null;
  },

  async findLines(db: LooseDb, docEntry: number) {
    return db
      .select()
      .from(grpoLines)
      .where(eq(grpoLines.docEntry, docEntry))
      .orderBy(asc(grpoLines.lineNum));
  },

  async findLineBaseEntries(db: LooseDb, docEntry: number) {
    return db
      .select({ baseEntry: grpoLines.baseEntry })
      .from(grpoLines)
      .where(eq(grpoLines.docEntry, docEntry));
  },

  async findDocNums(db: LooseDb, search: string | undefined, limit: number) {
    return db
      .select({ docNum: grpo.docNum })
      .from(grpo)
      .where(search ? sql`CAST(${grpo.docNum} AS TEXT) LIKE ${`%${search}%`}` : undefined)
      .limit(limit)
      .orderBy(desc(grpo.docNum));
  },

  async insertHeader(db: LooseDb, values: LooseValues) {
    const [row] = await db.insert(grpo).values(values).returning();
    return row;
  },

  async updateHeader(db: LooseDb, id: number, values: LooseValues) {
    return db.update(grpo).set(values).where(eq(grpo.id, id));
  },

  async deleteLines(db: LooseDb, docEntry: number) {
    return db.delete(grpoLines).where(eq(grpoLines.docEntry, docEntry));
  },

  async insertLines(db: LooseDb, lines: LooseValues[]) {
    return db.insert(grpoLines).values(lines);
  },
};
