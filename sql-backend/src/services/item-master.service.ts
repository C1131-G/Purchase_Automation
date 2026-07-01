// Item Master Service: Query items table with filters matching hana's SAP OITM queries.

import { and, asc, count, desc, eq, like, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { items } from "@/db/schema/items";

interface ItemMasterQuery {
  ItemCode?: string;
  ItemName?: string;
  frozenFor?: string;
  validFor?: string;
  ItmsGrpCod?: number;
  InvntryUom?: string;
  CodeBars?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page: number;
  limit: number;
}

export const getItems = async (filters: ItemMasterQuery) => {
  const db = getDb();
  const offset = (filters.page - 1) * filters.limit;

  const whereConditions = and(
    filters.ItemCode ? like(items.code, `%${filters.ItemCode}%`) : undefined,
    filters.ItemName ? like(items.name, `%${filters.ItemName}%`) : undefined,
    filters.frozenFor !== undefined ? eq(items.frozen, filters.frozenFor === "Y") : undefined,
    filters.ItmsGrpCod ? eq(items.itemGroupCode, filters.ItmsGrpCod) : undefined,
    filters.InvntryUom ? like(items.inventoryUom, `%${filters.InvntryUom}%`) : undefined,
    filters.CodeBars ? like(items.barcode, `%${filters.CodeBars}%`) : undefined,
    filters.validFor !== undefined ? undefined : undefined, // no validFor concept in sql items table
  );

  const [totalResult] = await db.select({ total: count() }).from(items).where(whereConditions);
  const total = Number(totalResult.total);

  const sortCol = (() => {
    switch (filters.sortBy) {
      case "ItemName":
        return items.name;
      case "ItmsGrpCod":
        return items.itemGroupCode;
      case "AvgPrice":
        return items.avgPrice;
      case "InvntItem":
        return items.inventoryItem;
      case "CodeBars":
        return items.barcode;
      default:
        return items.code;
    }
  })();

  const orderBy = filters.sortOrder === "desc" ? desc(sortCol) : asc(sortCol);

  const rows = await db
    .select()
    .from(items)
    .where(whereConditions)
    .orderBy(orderBy)
    .limit(filters.limit)
    .offset(offset);

  const data = rows.map((r) => ({
    ItemCode: r.code,
    ItemName: r.name,
    FrgnName: r.foreignName,
    ItmsGrpCod: r.itemGroupCode,
    InvntryUom: r.inventoryUom,
    OnHand: null,
    IsCommited: null,
    OnOrder: null,
    AvgPrice: r.avgPrice ? Number(r.avgPrice) : null,
    LastPurPrc: r.lastPurchasePrice ? Number(r.lastPurchasePrice) : null,
    LastPurDat: r.lastPurchaseDate,
    ManBtchNum: null,
    ManSerNum: null,
    validFor: null,
    frozenFor: r.frozen ? "Y" : "N",
    InvntItem: r.inventoryItem ? "Y" : "N",
    CodeBars: r.barcode,
    id: r.id,
  }));

  return {
    data,
    total,
    page: filters.page,
    limit: filters.limit,
    totalPages: Math.ceil(total / filters.limit),
  };
};

export const getItemByItemCode = async (itemCode: string) => {
  const db = getDb();
  const [row] = await db.select().from(items).where(eq(items.code, itemCode)).limit(1);
  if (!row) return null;
  return {
    ItemCode: row.code,
    ItemName: row.name,
    FrgnName: row.foreignName,
    ItmsGrpCod: row.itemGroupCode,
    InvntryUom: row.inventoryUom,
    OnHand: null,
    IsCommited: null,
    OnOrder: null,
    AvgPrice: row.avgPrice ? Number(row.avgPrice) : null,
    LastPurPrc: row.lastPurchasePrice ? Number(row.lastPurchasePrice) : null,
    LastPurDat: row.lastPurchaseDate,
    ManBtchNum: null,
    ManSerNum: null,
    validFor: null,
    frozenFor: row.frozen ? "Y" : "N",
    InvntItem: row.inventoryItem ? "Y" : "N",
    CodeBars: row.barcode,
    id: row.id,
  };
};

export const getItemCodes = async (search?: string, limit: number = 10) => {
  const db = getDb();
  const rows = await db
    .select({ code: items.code, name: items.name })
    .from(items)
    .where(
      search ? or(like(items.code, `%${search}%`), like(items.name, `%${search}%`)) : undefined,
    )
    .orderBy(asc(items.code))
    .limit(limit);
  return rows.map((r) => ({ code: r.code, name: r.name }));
};

export const getItemNames = async (search?: string, limit: number = 10) => {
  const db = getDb();
  const rows = await db
    .select({ code: items.code, name: items.name })
    .from(items)
    .where(
      search ? or(like(items.code, `%${search}%`), like(items.name, `%${search}%`)) : undefined,
    )
    .orderBy(asc(items.name))
    .limit(limit);
  return rows.map((r) => ({ code: r.code, name: r.name }));
};

export const getItemGroups = async (search?: string, limit: number = 10) => {
  const db = getDb();
  const rows = await db
    .select({ code: items.itemGroupCode })
    .from(items)
    .where(
      and(
        sql`${items.itemGroupCode} IS NOT NULL`,
        sql`${items.itemGroupCode} > 0`,
        search ? sql`CAST(${items.itemGroupCode} AS TEXT) LIKE ${`%${search}%`}` : undefined,
      ),
    )
    .groupBy(items.itemGroupCode)
    .orderBy(asc(items.itemGroupCode))
    .limit(limit);
  return rows.map((r) => ({ code: String(r.code), name: String(r.code) }));
};

export const getInvntryUoms = async (search?: string, limit: number = 10) => {
  const db = getDb();
  const rows = await db
    .select({ uom: items.inventoryUom })
    .from(items)
    .where(
      and(
        sql`${items.inventoryUom} IS NOT NULL`,
        sql`${items.inventoryUom} <> ''`,
        search ? like(items.inventoryUom, `%${search}%`) : undefined,
      ),
    )
    .groupBy(items.inventoryUom)
    .orderBy(asc(items.inventoryUom))
    .limit(limit);
  return rows.map((r) => ({ code: r.uom, name: r.uom }));
};

export const getBarCodes = async (search?: string, limit: number = 10) => {
  const db = getDb();
  const rows = await db
    .select({ barcode: items.barcode })
    .from(items)
    .where(
      and(
        sql`${items.barcode} IS NOT NULL`,
        sql`${items.barcode} <> ''`,
        search ? like(items.barcode, `%${search}%`) : undefined,
      ),
    )
    .groupBy(items.barcode)
    .orderBy(asc(items.barcode))
    .limit(limit);
  return rows.map((r) => ({ code: r.barcode, name: r.barcode }));
};

export const itemMasterService = {
  getBarCodes,
  getInvntryUoms,
  getItemByItemCode,
  getItemCodes,
  getItemGroups,
  getItemNames,
  getItems,
};
