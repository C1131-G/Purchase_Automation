// Master Data Service: Read-only lookups for business partners, items, warehouses, and reference data.
// Mirrors hana-backend/src/services/master-data.service.ts but queries local PostgreSQL via Drizzle.

import { and, eq, inArray, like, or, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import { businessPartners } from "@/db/schema/business-partners";
import { businessPartnerAddresses } from "@/db/schema/business-partner-addresses";
import { items } from "@/db/schema/items";
import { itemWarehouseStock } from "@/db/schema/item-warehouse-stock";
import { warehouses } from "@/db/schema/warehouses";
import { taxGroups } from "@/db/schema/tax-groups";
import { unitOfMeasurements } from "@/db/schema/unit-of-measurements";
import { priceLists } from "@/db/schema/price-lists";
import { salesEmployees } from "@/db/schema/sales-employees";
import { chartOfAccounts } from "@/db/schema/chart-of-accounts";
import { itemPrices } from "@/db/schema/item-prices";
import { getCachedData } from "@/core/utils/cache";
import { getDisplayCurrency } from "@/services/currency.util";

const tenMinutes = 1000 * 60 * 10;
const fiveMinutes = 1000 * 60 * 5;

export interface ProductFilters {
  warehouseCode?: string;
  search?: string;
  limit?: number;
  type?: "sales" | "purchase";
  priceList?: number;
}

// ─── Products ────────────────────────────────────────────────────────────────

export const getProducts = async (filters: ProductFilters = {}) => {
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

      const rows = await db
        .select({
          code: items.code,
          name: items.name,
          foreignName: items.foreignName,
          inventoryUom: items.inventoryUom,
          barcode: items.barcode,
          avgPrice: items.avgPrice,
          lastPurchasePrice: items.lastPurchasePrice,
          defaultWarehouse: items.defaultWarehouse,
        })
        .from(items)
        .where(conditions)
        .limit(limit);

      if (rows.length === 0) {
        return [];
      }

      const codes = rows.map((r) => r.code);

      // Bulk fetch stock to avoid N+1 queries
      const stockMap = new Map<string, number>();
      if (filters.warehouseCode) {
        const stocks = await db
          .select({
            itemCode: itemWarehouseStock.itemCode,
            qty: itemWarehouseStock.onHand,
          })
          .from(itemWarehouseStock)
          .where(
            and(
              inArray(itemWarehouseStock.itemCode, codes),
              eq(itemWarehouseStock.warehouseCode, filters.warehouseCode),
            ),
          );
        for (const s of stocks) {
          stockMap.set(s.itemCode, Number(s.qty ?? 0));
        }
      } else {
        const stocks = await db
          .select({
            itemCode: itemWarehouseStock.itemCode,
            qty: itemWarehouseStock.onHand,
          })
          .from(itemWarehouseStock)
          .where(inArray(itemWarehouseStock.itemCode, codes));
        for (const s of stocks) {
          const current = stockMap.get(s.itemCode) ?? 0;
          stockMap.set(s.itemCode, current + Number(s.qty ?? 0));
        }
      }

      // Bulk fetch price to avoid N+1 queries
      const priceMap = new Map<string, number>();
      if (filters.priceList !== undefined && filters.priceList !== null) {
        const prices = await db
          .select({
            itemCode: itemPrices.itemCode,
            price: itemPrices.price,
          })
          .from(itemPrices)
          .where(
            and(inArray(itemPrices.itemCode, codes), eq(itemPrices.priceList, filters.priceList)),
          );
        for (const p of prices) {
          priceMap.set(p.itemCode, Number(p.price ?? 0));
        }
      }

      // Fetch UOMs
      const uoms = await db.select().from(unitOfMeasurements);
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

      // Fetch Tax Groups
      const activeTaxes = await db.select().from(taxGroups).where(eq(taxGroups.inactive, false));
      const taxMap = new Map<string, number>();
      for (const t of activeTaxes) {
        taxMap.set(t.code.toUpperCase(), Number(t.rate ?? 0));
      }

      const defaultCurrency = await getDisplayCurrency();

      return rows.map((row) => {
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
          ? [{ code: resolvedUomCode, name: resolvedUomName, entry: resolvedUomEntry }]
          : [];

        return {
          id: row.code,
          productCode: row.code,
          productName: row.name,
          ItemCode: row.code,
          ItemName: row.name,
          OnHand: resolvedStock,
          stock: resolvedStock,
          Price: resolvedPrice,
          AvgPrice: Number(row.avgPrice ?? 0),
          Currency: defaultCurrency,
          UoMCode: resolvedUomCode,
          UoMEntry: resolvedUomEntry,
          UoMName: resolvedUomName,
          Uom: inventoryUomText,
          UomList: uomList,
          PurchaseUoMCode: resolvedUomCode,
          PurchaseUoMEntry: resolvedUomEntry,
          PurchaseUom: inventoryUomText,
          TaxCode: resolvedTaxCode,
          TaxRate: resolvedTaxRate,
          taxCode: resolvedTaxCode,
          taxRate: resolvedTaxRate,
          Warehouse: filters.warehouseCode || row.defaultWarehouse || "",
        };
      });
    },
    tenMinutes,
  );
};

// ─── Product Warehouse Stock ─────────────────────────────────────────────────

export const getProductWarehouseStocks = async (itemCode: string) => {
  const cacheKey = `master:stock:${itemCode}`;

  return getCachedData(
    cacheKey,
    async () => {
      const db = getDb();

      const rows = await db
        .select({
          warehouseCode: warehouses.code,
          warehouseName: warehouses.name,
          onHand: itemWarehouseStock.onHand,
        })
        .from(itemWarehouseStock)
        .innerJoin(warehouses, eq(itemWarehouseStock.warehouseCode, warehouses.code))
        .where(and(eq(itemWarehouseStock.itemCode, itemCode), eq(warehouses.inactive, false)));

      return rows.map((r) => ({ ...r, onHand: Number(r.onHand ?? 0) }));
    },
    fiveMinutes,
  );
};

// ─── Business Partners ───────────────────────────────────────────────────────

const getPartners = async (type: string, search?: string) => {
  const cacheKey = `master:${type}:${search ?? ""}`;

  return getCachedData(
    cacheKey,
    async () => {
      const db = getDb();

      const conditions = and(
        eq(businessPartners.type, type),
        eq(businessPartners.frozen, false),
        search
          ? or(
              like(businessPartners.code, `%${search}%`),
              like(businessPartners.name, `%${search}%`),
            )
          : undefined,
      );

      const partners = await db.select().from(businessPartners).where(conditions);

      const codes = partners.map((p) => p.code);
      const addresses =
        codes.length > 0
          ? await db
              .select()
              .from(businessPartnerAddresses)
              .where(
                sql`${businessPartnerAddresses.cardCode} = ANY(${sql.raw(`ARRAY[${codes.map((c) => `'${c.replace(/'/g, "''")}'`).join(",")}]`)})`,
              )
          : [];

      const slpCodes = partners
        .map((p) => p.salesEmployeeCode)
        .filter((code): code is number => code !== null && code !== undefined);

      const salesEmployeeMap = new Map<number, string>();
      if (slpCodes.length > 0) {
        const slpRows = await db
          .select({
            code: salesEmployees.code,
            name: salesEmployees.name,
          })
          .from(salesEmployees)
          .where(and(inArray(salesEmployees.code, slpCodes), eq(salesEmployees.active, true)));
        for (const row of slpRows) {
          salesEmployeeMap.set(row.code, row.name);
        }
      }

      const addressMap = new Map<
        string,
        {
          billToAddress?: string;
          shipToAddress?: string;
          addresses: {
            addressName: string;
            addressType: "B" | "S";
            addressText: string;
          }[];
        }
      >();

      for (const addr of addresses) {
        const cardCode = addr.cardCode;
        if (!addressMap.has(cardCode)) {
          addressMap.set(cardCode, { addresses: [] });
        }
        const entry = addressMap.get(cardCode)!;

        const parts = [addr.street, addr.block, addr.city, addr.state, addr.zipCode, addr.country]
          .map((s) => String(s || "").trim())
          .filter(Boolean);
        const formattedAddress =
          parts.length > 0 ? parts.join(", ") : String(addr.address || "").trim();

        if (formattedAddress) {
          entry.addresses.push({
            addressName: String(addr.address || "").trim(),
            addressType: (addr.addressType || "B") as "B" | "S",
            addressText: formattedAddress,
          });
        }
      }

      return partners.map((p) => {
        const entry = addressMap.get(p.code) || { addresses: [] };
        const billToDef = p.billToDef?.trim().toLowerCase() || "";
        const shipToDef = p.shipToDef?.trim().toLowerCase() || "";

        const bAddresses = entry.addresses.filter((a) => a.addressType === "B");
        const sAddresses = entry.addresses.filter((a) => a.addressType === "S");

        let defaultBillTo = billToDef
          ? bAddresses.find((a) => a.addressName.toLowerCase() === billToDef)
          : undefined;
        if (!defaultBillTo && bAddresses.length > 0) {
          defaultBillTo = bAddresses[0];
        }

        let defaultShipTo = shipToDef
          ? sAddresses.find((a) => a.addressName.toLowerCase() === shipToDef)
          : undefined;
        if (!defaultShipTo && sAddresses.length > 0) {
          defaultShipTo = sAddresses[0];
        }

        const salesEmployeeName =
          p.salesEmployeeCode !== null && p.salesEmployeeCode !== undefined
            ? (salesEmployeeMap.get(p.salesEmployeeCode) ?? "")
            : "";

        return {
          id: p.code,
          CardCode: p.code,
          CardName: p.name,
          Address: p.billToAddress || "",
          Currency: p.currency,
          SlpCode: p.salesEmployeeCode,
          code: p.code,
          name: p.name,
          currency: p.currency,
          phone: p.phone,
          email: p.email,
          billToAddress: defaultBillTo?.addressText || p.billToAddress || "",
          shipToAddress:
            defaultShipTo?.addressText || defaultBillTo?.addressText || p.shipToAddress || "",
          addresses: entry.addresses,
          salesEmployeeCode: p.salesEmployeeCode,
          SalesEmployeeCode: p.salesEmployeeCode,
          salesEmployeeName,
          SalesEmployeeName: salesEmployeeName,
        };
      });
    },
    tenMinutes,
  );
};

export const getVendors = (search?: string) => getPartners("S", search);
export const getCustomers = (search?: string) => getPartners("C", search);

// ─── Reference Data ─────────────────────────────────────────────────────────

export const getTaxCodes = async () => {
  return getCachedData(
    "master:taxcodes",
    async () => {
      const db = getDb();
      return db
        .select({
          code: taxGroups.code,
          name: taxGroups.name,
          rate: taxGroups.rate,
        })
        .from(taxGroups)
        .where(eq(taxGroups.inactive, false));
    },
    tenMinutes,
  );
};

export const getUOMs = async () => {
  return getCachedData(
    "master:uoms",
    async () => {
      const db = getDb();
      return db.select().from(unitOfMeasurements);
    },
    tenMinutes,
  );
};

export const getPriceLists = async () => {
  return getCachedData(
    "master:pricelists",
    async () => {
      const db = getDb();
      return db.select().from(priceLists);
    },
    tenMinutes,
  );
};

export const getWarehouses = async () => {
  return getCachedData(
    "master:warehouses",
    async () => {
      const db = getDb();
      return db.select().from(warehouses).where(eq(warehouses.inactive, false));
    },
    tenMinutes,
  );
};

export const getSalesEmployees = async () => {
  return getCachedData(
    "master:employees",
    async () => {
      const db = getDb();
      return db.select().from(salesEmployees).where(eq(salesEmployees.active, true));
    },
    tenMinutes,
  );
};

export const getChartOfAccounts = async () => {
  return getCachedData(
    "master:coa",
    async () => {
      const db = getDb();
      return db.select().from(chartOfAccounts);
    },
    tenMinutes,
  );
};

export const resolveCardName = async (
  cardCode: string | undefined | null,
  cardName: string | undefined | null,
): Promise<string | null> => {
  if (cardName && cardName.trim()) return cardName.trim();
  if (!cardCode || !cardCode.trim()) return null;

  const db = getDb();
  const [bp] = await db
    .select({ name: businessPartners.name })
    .from(businessPartners)
    .where(eq(businessPartners.code, cardCode.trim()))
    .limit(1);

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
