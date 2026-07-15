import { asc, desc, eq, sql } from "drizzle-orm";

import { attachments } from "@/db/schema/attachments";
import { goodsIssueLines } from "@/db/schema/goods-issue-lines";
import { goodsIssues } from "@/db/schema/goods-issues";
import type { LooseDb, LooseWhere, LooseOrderBy, LooseValues } from "@/types/db.types";

export const goodsIssueRepository = {
  async findList(
    db: LooseDb,
    where: LooseWhere,
    orderBy: LooseOrderBy,
    limit: number,
    offset: number,
  ) {
    return db.select().from(goodsIssues).where(where).orderBy(orderBy).limit(limit).offset(offset);
  },

  async countList(db: LooseDb, where: LooseWhere): Promise<number> {
    const [result] = await db
      .select({ total: sql<number>`count(*)` })
      .from(goodsIssues)
      .where(where);
    return Number(result?.total || 0);
  },

  async findById(db: LooseDb, id: number) {
    const [row] = await db.select().from(goodsIssues).where(eq(goodsIssues.id, id)).limit(1);
    return row || null;
  },

  async findByDocNum(db: LooseDb, docNum: number) {
    const [row] = await db
      .select()
      .from(goodsIssues)
      .where(eq(goodsIssues.docNum, docNum))
      .limit(1);
    return row || null;
  },

  async findLines(db: LooseDb, docEntry: number) {
    return db
      .select()
      .from(goodsIssueLines)
      .where(eq(goodsIssueLines.docEntry, docEntry))
      .orderBy(asc(goodsIssueLines.lineNum));
  },

  async findAttachments(db: LooseDb, absEntry: number) {
    return db.select().from(attachments).where(eq(attachments.absEntry, absEntry));
  },

  async findDocNums(db: LooseDb, search: string | undefined, limit: number) {
    return db
      .select({ docNum: goodsIssues.docNum })
      .from(goodsIssues)
      .where(search ? sql`CAST(${goodsIssues.docNum} AS TEXT) LIKE ${`%${search}%`}` : undefined)
      .limit(limit)
      .orderBy(desc(goodsIssues.docNum));
  },

  async insertHeader(db: LooseDb, values: LooseValues) {
    const [row] = await db.insert(goodsIssues).values(values).returning();
    return row;
  },

  async updateHeader(db: LooseDb, id: number, values: LooseValues) {
    return db.update(goodsIssues).set(values).where(eq(goodsIssues.id, id));
  },

  async insertLines(db: LooseDb, lines: LooseValues[]) {
    return db.insert(goodsIssueLines).values(lines);
  },

  async insertAttachments(db: LooseDb, rows: LooseValues[]) {
    return db.insert(attachments).values(rows);
  },

  async deleteAttachments(db: LooseDb, absEntry: number) {
    return db.delete(attachments).where(eq(attachments.absEntry, absEntry));
  },
};
