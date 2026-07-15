import { and, eq, like, or } from "drizzle-orm";

import { getCachedData } from "@/core/utils/cache.util";
import { getDb } from "@/db/client";
import { items } from "@/db/schema/items";
import { getDisplayCurrency } from "@/services/currency.util";
import type { DynRow } from "@/types/drizzle.types";

import { masterDataRepository } from "./master-data.repository";

const tenMinutes = 1000 * 60 * 10;
const fiveMinutes = 1000 * 60 * 5;

export interface ProductFilters {
  warehouseCode?: string;
  search?: string;
  limit?: number;
  type?: "sales" | "purchase";
  priceList?: number;
}

export const getProducts = (filters: ProductFilters = {}) => {
  const cacheKey = `master:products:${JSON.stringify(filters)}`;

  return getCachedData(
    cacheKey,
    async () => {
      const db = getDb();
      const limit = filters.limit ?? 50;

      const conditions = and(
        eq(items.frozen, false),
        filters.search
          ? or(like(items.code, `%${filters.search}%`), like(items.name, `%${filters.search}%`))
          : undefined,
        filters.type === "sales" ? eq(items.salesItem, true) : undefined,
        filters.type === "purchase" ? eq(items.purchaseItem, true) : undefined,
      );

      const rows = await masterDataRepository.findActiveProducts(db, conditions, limit);
      if (rows.length === 0) {
        return [];
      }

      const codes = rows.map((r: DynRow) => r.code);

      const stockMap = new Map<string, number>();
      const stocks = await masterDataRepository.findWarehouseStockByItemCodes(
        db,
        codes,
        filters.warehouseCode,
      );
      for (const s of stocks) {
        if (filters.warehouseCode) {
          stockMap.set(s.itemCode, Number(s.qty ?? 0));
        } else {
          const current = stockMap.get(s.itemCode) ?? 0;
          stockMap.set(s.itemCode, current + Number(s.qty ?? 0));
        }
      }

      const priceMap = new Map<string, number>();
      if (filters.priceList !== undefined && filters.priceList !== null) {
        const prices = await masterDataRepository.findPricesByItemCodes(
          db,
          codes,
          filters.priceList,
        );
        for (const p of prices) {
          priceMap.set(p.itemCode, Number(p.price ?? 0));
        }
      }

      const uoms = await masterDataRepository.findAllUnitOfMeasurements(db);
      const uomMap = new Map<string, { code: string; entry: number; name: string }>();
      for (const u of uoms) {
        if (u.code) {
          uomMap.set(u.code.toLowerCase(), {
            code: u.code,
            entry: u.entry,
            name: u.name,
          });
        }
      }

      const activeTaxes = await masterDataRepository.findActiveTaxGroups(db);
      const taxMap = new Map<string, number>();
      for (const t of activeTaxes) {
        taxMap.set(t.code.toUpperCase(), Number(t.rate ?? 0));
      }

      const defaultCurrency = await getDisplayCurrency();

      return rows.map((row: DynRow) => {
        const resolvedStock = stockMap.get(row.code) ?? 0;
        const resolvedPrice = priceMap.has(row.code)
          ? priceMap.get(row.code)!
          : Number(row.avgPrice ?? 0);

        const resolvedTaxCode = filters.type === "purchase" ? "I1" : "O1";
        const resolvedTaxRate = taxMap.get(resolvedTaxCode.toUpperCase()) ?? 0;

        const inventoryUomText = row.inventoryUom || "";
        const resolvedUom = inventoryUomText
          ? uomMap.get(inventoryUomText.toLowerCase())
          : undefined;
        const resolvedUomCode = resolvedUom?.code || inventoryUomText;
        const resolvedUomEntry = resolvedUom?.entry;
        const resolvedUomName = resolvedUom?.name || resolvedUomCode;

        const uomList = resolvedUomCode
          ? [
              {
                code: resolvedUomCode,
                entry: resolvedUomEntry,
                name: resolvedUomName,
              },
            ]
          : [];

        return {
          AvgPrice: Number(row.avgPrice ?? 0),
          Currency: defaultCurrency,
          ItemCode: row.code,
          ItemName: row.name,
          OnHand: resolvedStock,
          Price: resolvedPrice,
          PurchaseUoMCode: resolvedUomCode,
          PurchaseUoMEntry: resolvedUomEntry,
          PurchaseUom: inventoryUomText,
          TaxCode: resolvedTaxCode,
          TaxRate: resolvedTaxRate,
          UoMCode: resolvedUomCode,
          UoMEntry: resolvedUomEntry,
          UoMName: resolvedUomName,
          Uom: inventoryUomText,
          UomList: uomList,
          Warehouse: filters.warehouseCode || row.defaultWarehouse || "",
          id: row.code,
          productCode: row.code,
          productName: row.name,
          stock: resolvedStock,
          taxCode: resolvedTaxCode,
          taxRate: resolvedTaxRate,
        };
      });
    },
    tenMinutes,
  );
};

export const getProductWarehouseStocks = (itemCode: string) => {
  const cacheKey = `master:stock:${itemCode}`;

  return getCachedData(
    cacheKey,
    async () => {
      const db = getDb();
      const rows = await masterDataRepository.findProductWarehouseStocks(db, itemCode);
      return rows.map((r: DynRow) => ({ ...r, onHand: Number(r.onHand ?? 0) }));
    },
    fiveMinutes,
  );
};

const getPartners = (type: string, search?: string) => {
  const cacheKey = `master:${type}:${search ?? ""}`;

  return getCachedData(
    cacheKey,
    async () => {
      const db = getDb();
      return masterDataRepository.findPartnersByTypeAndSearch(db, type, search);
    },
    tenMinutes,
  );
};

export const getVendors = (search?: string) => getPartners("S", search);
export const getCustomers = (search?: string) => getPartners("C", search);

export const getTaxCodes = () =>
  getCachedData(
    "master:taxcodes",
    () => {
      const db = getDb();
      return masterDataRepository.findActiveTaxGroups(db);
    },
    tenMinutes,
  );

export const getUOMs = () =>
  getCachedData(
    "master:uoms",
    () => {
      const db = getDb();
      return masterDataRepository.findAllUnitOfMeasurements(db);
    },
    tenMinutes,
  );

export const getPriceLists = () =>
  getCachedData(
    "master:pricelists",
    () => {
      const db = getDb();
      return masterDataRepository.findAllPriceLists(db);
    },
    tenMinutes,
  );

export const getWarehouses = () =>
  getCachedData(
    "master:warehouses",
    () => {
      const db = getDb();
      return masterDataRepository.findActiveWarehouses(db);
    },
    tenMinutes,
  );

export const getSalesEmployees = () =>
  getCachedData(
    "master:employees",
    () => {
      const db = getDb();
      return masterDataRepository.findActiveSalesEmployees(db);
    },
    tenMinutes,
  );

export const getChartOfAccounts = () =>
  getCachedData(
    "master:coa",
    () => {
      const db = getDb();
      return masterDataRepository.findAllChartOfAccounts(db);
    },
    tenMinutes,
  );

export const resolveCardName = async (
  cardCode: string | undefined | null,
  cardName: string | undefined | null,
): Promise<string | null> => {
  if (cardName && cardName.trim()) {
    return cardName.trim();
  }
  if (!cardCode || !cardCode.trim()) {
    return null;
  }
  const db = getDb();
  const bp = await masterDataRepository.findBusinessPartnerName(db, cardCode.trim());
  return bp?.name ?? null;
};

export const masterDataService = {
  getChartOfAccounts,
  getCustomers,
  getPriceLists,
  getProductWarehouseStocks,
  getProducts,
  getSalesEmployees,
  getTaxCodes,
  getUOMs,
  getVendors,
  getWarehouses,
};
