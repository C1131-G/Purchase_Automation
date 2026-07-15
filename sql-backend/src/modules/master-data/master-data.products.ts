import { and, eq, like, or } from "drizzle-orm";

import { getCachedData } from "@/core/utils/cache";
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

      const productRows = await masterDataRepository.findActiveProducts(db, conditions, limit);
      if (productRows.length === 0) {
        return [];
      }

      const itemCodes = productRows.map((row: DynRow) => row.code);
      const stockByItemCode = await loadStockByItemCode(db, itemCodes, filters.warehouseCode);
      const priceByItemCode = await loadPriceByItemCode(db, itemCodes, filters.priceList);
      const uomByCode = await loadUomByCode(db);
      const taxRateByCode = await loadTaxRateByCode(db);
      const defaultCurrency = await getDisplayCurrency();

      return productRows.map((row: DynRow) =>
        mapProductRow({
          row,
          stockByItemCode,
          priceByItemCode,
          uomByCode,
          taxRateByCode,
          defaultCurrency,
          warehouseCode: filters.warehouseCode,
          productType: filters.type,
        }),
      );
    },
    tenMinutes,
  );
};

async function loadStockByItemCode(
  db: ReturnType<typeof getDb>,
  itemCodes: string[],
  warehouseCode?: string,
) {
  const stockByItemCode = new Map<string, number>();
  const stockRows = await masterDataRepository.findWarehouseStockByItemCodes(
    db,
    itemCodes,
    warehouseCode,
  );
  for (const stock of stockRows) {
    if (warehouseCode) {
      stockByItemCode.set(stock.itemCode, Number(stock.qty ?? 0));
    } else {
      const current = stockByItemCode.get(stock.itemCode) ?? 0;
      stockByItemCode.set(stock.itemCode, current + Number(stock.qty ?? 0));
    }
  }
  return stockByItemCode;
}

async function loadPriceByItemCode(
  db: ReturnType<typeof getDb>,
  itemCodes: string[],
  priceList?: number,
) {
  const priceByItemCode = new Map<string, number>();
  if (priceList === undefined || priceList === null) {
    return priceByItemCode;
  }
  const prices = await masterDataRepository.findPricesByItemCodes(db, itemCodes, priceList);
  for (const price of prices) {
    priceByItemCode.set(price.itemCode, Number(price.price ?? 0));
  }
  return priceByItemCode;
}

async function loadUomByCode(db: ReturnType<typeof getDb>) {
  const uomByCode = new Map<string, { code: string; entry: number; name: string }>();
  const uoms = await masterDataRepository.findAllUnitOfMeasurements(db);
  for (const uom of uoms) {
    if (uom.code) {
      uomByCode.set(uom.code.toLowerCase(), {
        code: uom.code,
        entry: uom.entry,
        name: uom.name,
      });
    }
  }
  return uomByCode;
}

async function loadTaxRateByCode(db: ReturnType<typeof getDb>) {
  const taxRateByCode = new Map<string, number>();
  const activeTaxes = await masterDataRepository.findActiveTaxGroups(db);
  for (const tax of activeTaxes) {
    taxRateByCode.set(tax.code.toUpperCase(), Number(tax.rate ?? 0));
  }
  return taxRateByCode;
}

function mapProductRow(input: {
  row: DynRow;
  stockByItemCode: Map<string, number>;
  priceByItemCode: Map<string, number>;
  uomByCode: Map<string, { code: string; entry: number; name: string }>;
  taxRateByCode: Map<string, number>;
  defaultCurrency: string;
  warehouseCode?: string;
  productType?: "sales" | "purchase";
}) {
  const {
    row,
    stockByItemCode,
    priceByItemCode,
    uomByCode,
    taxRateByCode,
    defaultCurrency,
    warehouseCode,
    productType,
  } = input;

  const resolvedStock = stockByItemCode.get(row.code) ?? 0;
  const resolvedPrice = priceByItemCode.has(row.code)
    ? priceByItemCode.get(row.code)!
    : Number(row.avgPrice ?? 0);

  const resolvedTaxCode = productType === "purchase" ? "I1" : "O1";
  const resolvedTaxRate = taxRateByCode.get(resolvedTaxCode.toUpperCase()) ?? 0;

  const inventoryUomText = row.inventoryUom || "";
  const resolvedUom = inventoryUomText ? uomByCode.get(inventoryUomText.toLowerCase()) : undefined;
  const resolvedUomCode = resolvedUom?.code || inventoryUomText;
  const resolvedUomEntry = resolvedUom?.entry;
  const resolvedUomName = resolvedUom?.name || resolvedUomCode;

  const uomList = resolvedUomCode
    ? [{ code: resolvedUomCode, entry: resolvedUomEntry, name: resolvedUomName }]
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
    Warehouse: warehouseCode || row.defaultWarehouse || "",
    id: row.code,
    productCode: row.code,
    productName: row.name,
    stock: resolvedStock,
    taxCode: resolvedTaxCode,
    taxRate: resolvedTaxRate,
  };
}

export const getProductWarehouseStocks = (itemCode: string) => {
  const cacheKey = `master:stock:${itemCode}`;

  return getCachedData(
    cacheKey,
    async () => {
      const db = getDb();
      const stockRows = await masterDataRepository.findProductWarehouseStocks(db, itemCode);
      return stockRows.map((row: DynRow) => ({ ...row, onHand: Number(row.onHand ?? 0) }));
    },
    fiveMinutes,
  );
};
