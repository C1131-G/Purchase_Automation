import { asc, count, eq } from "drizzle-orm";

import { items } from "@/db/schema/items";
import type { LooseDb, LooseWhere, LooseOrderBy } from "@/types/db.types";

export const itemMasterRepository = {
  async findList(
    db: LooseDb,
    where: LooseWhere,
    orderBy: LooseOrderBy,
    limit: number,
    offset: number,
  ) {
    return db.select().from(items).where(where).orderBy(orderBy).limit(limit).offset(offset);
  },

  async countList(db: LooseDb, where: LooseWhere): Promise<number> {
    const [result] = await db.select({ total: count() }).from(items).where(where);
    return Number(result?.total || 0);
  },

  async findByCode(db: LooseDb, code: string) {
    const [row] = await db.select().from(items).where(eq(items.code, code)).limit(1);
    return row || null;
  },

  async findCodesAndNames(db: LooseDb, where: LooseWhere, orderBy: LooseOrderBy, limit: number) {
    return db
      .select({ code: items.code, name: items.name })
      .from(items)
      .where(where)
      .orderBy(orderBy)
      .limit(limit);
  },

  async findGroups(db: LooseDb, where: LooseWhere, limit: number) {
    return db
      .select({ code: items.itemGroupCode })
      .from(items)
      .where(where)
      .groupBy(items.itemGroupCode)
      .orderBy(asc(items.itemGroupCode))
      .limit(limit);
  },

  async findUoms(db: LooseDb, where: LooseWhere, limit: number) {
    return db
      .select({ uom: items.inventoryUom })
      .from(items)
      .where(where)
      .groupBy(items.inventoryUom)
      .orderBy(asc(items.inventoryUom))
      .limit(limit);
  },

  async findBarcodes(db: LooseDb, where: LooseWhere, limit: number) {
    return db
      .select({ barcode: items.barcode })
      .from(items)
      .where(where)
      .groupBy(items.barcode)
      .orderBy(asc(items.barcode))
      .limit(limit);
  },
};
