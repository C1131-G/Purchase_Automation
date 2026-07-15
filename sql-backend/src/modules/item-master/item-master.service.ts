import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import { items } from "@/db/schema/items";
import type { DynRow } from "@/types/drizzle.types";

import { itemMasterRepository } from "./item-master.repository";

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
    filters.frozenFor === undefined ? undefined : eq(items.frozen, filters.frozenFor === "Y"),
    filters.ItmsGrpCod ? eq(items.itemGroupCode, filters.ItmsGrpCod) : undefined,
    filters.InvntryUom ? like(items.inventoryUom, `%${filters.InvntryUom}%`) : undefined,
    filters.CodeBars ? like(items.barcode, `%${filters.CodeBars}%`) : undefined,
  );

  const total = await itemMasterRepository.countList(db, whereConditions);

  const sortCol = (() => {
    switch (filters.sortBy) {
      case "ItemName": {
        return items.name;
      }
      case "ItmsGrpCod": {
        return items.itemGroupCode;
      }
      case "AvgPrice": {
        return items.avgPrice;
      }
      case "InvntItem": {
        return items.inventoryItem;
      }
      case "CodeBars": {
        return items.barcode;
      }
      default: {
        return items.code;
      }
    }
  })();

  const orderBy = filters.sortOrder === "desc" ? desc(sortCol) : asc(sortCol);

  const rows = await itemMasterRepository.findList(
    db,
    whereConditions,
    orderBy,
    filters.limit,
    offset,
  );

  const data = rows.map((r: DynRow) => ({
    AvgPrice: r.avgPrice ? Number(r.avgPrice) : null,
    CodeBars: r.barcode,
    FrgnName: r.foreignName,
    InvntItem: r.inventoryItem ? "Y" : "N",
    InvntryUom: r.inventoryUom,
    IsCommited: null,
    ItemCode: r.code,
    ItemName: r.name,
    ItmsGrpCod: r.itemGroupCode,
    LastPurDat: r.lastPurchaseDate,
    LastPurPrc: r.lastPurchasePrice ? Number(r.lastPurchasePrice) : null,
    ManBtchNum: null,
    ManSerNum: null,
    OnHand: null,
    OnOrder: null,
    frozenFor: r.frozen ? "Y" : "N",
    id: r.id,
    validFor: null,
  }));

  return {
    data,
    limit: filters.limit,
    page: filters.page,
    total,
    totalPages: Math.ceil(total / filters.limit),
  };
};

export const getItemByItemCode = async (itemCode: string) => {
  const db = getDb();
  const row = await itemMasterRepository.findByCode(db, itemCode);
  if (!row) {
    return null;
  }
  return {
    AvgPrice: row.avgPrice ? Number(row.avgPrice) : null,
    CodeBars: row.barcode,
    FrgnName: row.foreignName,
    InvntItem: row.inventoryItem ? "Y" : "N",
    InvntryUom: row.inventoryUom,
    IsCommited: null,
    ItemCode: row.code,
    ItemName: row.name,
    ItmsGrpCod: row.itemGroupCode,
    LastPurDat: row.lastPurchaseDate,
    LastPurPrc: row.lastPurchasePrice ? Number(row.lastPurchasePrice) : null,
    ManBtchNum: null,
    ManSerNum: null,
    OnHand: null,
    OnOrder: null,
    frozenFor: row.frozen ? "Y" : "N",
    id: row.id,
    validFor: null,
  };
};

export const getItemCodes = async (search?: string, limit = 10) => {
  const db = getDb();
  const where = search
    ? or(like(items.code, `%${search}%`), like(items.name, `%${search}%`))
    : undefined;
  const rows = await itemMasterRepository.findCodesAndNames(db, where, asc(items.code), limit);
  return rows.map((r: DynRow) => ({ code: r.code, name: r.name }));
};

export const getItemNames = async (search?: string, limit = 10) => {
  const db = getDb();
  const where = search
    ? or(like(items.code, `%${search}%`), like(items.name, `%${search}%`))
    : undefined;
  const rows = await itemMasterRepository.findCodesAndNames(db, where, asc(items.name), limit);
  return rows.map((r: DynRow) => ({ code: r.code, name: r.name }));
};

export const getItemGroups = async (search?: string, limit = 10) => {
  const db = getDb();
  const where = and(
    sql`${items.itemGroupCode} IS NOT NULL`,
    sql`${items.itemGroupCode} > 0`,
    search ? sql`CAST(${items.itemGroupCode} AS TEXT) LIKE ${`%${search}%`}` : undefined,
  );
  const rows = await itemMasterRepository.findGroups(db, where, limit);
  return rows.map((r: DynRow) => ({
    code: String(r.code),
    name: String(r.code),
  }));
};

export const getInvntryUoms = async (search?: string, limit = 10) => {
  const db = getDb();
  const where = and(
    sql`${items.inventoryUom} IS NOT NULL`,
    sql`${items.inventoryUom} <> ''`,
    search ? like(items.inventoryUom, `%${search}%`) : undefined,
  );
  const rows = await itemMasterRepository.findUoms(db, where, limit);
  return rows.map((r: DynRow) => ({ code: r.uom, name: r.uom }));
};

export const getBarCodes = async (search?: string, limit = 10) => {
  const db = getDb();
  const where = and(
    sql`${items.barcode} IS NOT NULL`,
    sql`${items.barcode} <> ''`,
    search ? like(items.barcode, `%${search}%`) : undefined,
  );
  const rows = await itemMasterRepository.findBarcodes(db, where, limit);
  return rows.map((r: DynRow) => ({ code: r.barcode, name: r.barcode }));
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
