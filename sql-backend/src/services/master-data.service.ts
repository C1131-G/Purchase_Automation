// Master Data Service: Read-only lookups for business partners, items, warehouses, and reference data.
// Mirrors hana-backend/src/services/master-data.service.ts but queries local PostgreSQL via Drizzle.

import { and, eq, like, or, sql } from "drizzle-orm";

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
        })
        .from(items)
        .where(conditions)
        .limit(limit);

      const enriched = await Promise.all(
        rows.map(async (row) => {
          let onHand = 0;
          let price: number | undefined;

          if (filters.warehouseCode) {
            const [stock] = await db
              .select({ qty: itemWarehouseStock.onHand })
              .from(itemWarehouseStock)
              .where(
                and(
                  eq(itemWarehouseStock.itemCode, row.code),
                  eq(itemWarehouseStock.warehouseCode, filters.warehouseCode),
                ),
              )
              .limit(1);
            onHand = stock ? Number(stock.qty ?? 0) : 0;
          }

          if (filters.priceList) {
            const [priceRow] = await db
              .select({ p: itemPrices.price })
              .from(itemPrices)
              .where(
                and(eq(itemPrices.itemCode, row.code), eq(itemPrices.priceList, filters.priceList)),
              )
              .limit(1);
            price = priceRow ? Number(priceRow.p ?? 0) : undefined;
          }

          return { ...row, onHand, price };
        }),
      );

      return enriched;
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
        const defaults = {
          billToDef: p.billToDef,
          shipToDef: p.shipToDef,
        };

        const bAddresses = entry.addresses.filter((a) => a.addressType === "B");
        const sAddresses = entry.addresses.filter((a) => a.addressType === "S");

        const defaultBillTo =
          bAddresses.find(
            (a) => a.addressName.toLowerCase() === defaults.billToDef?.trim().toLowerCase(),
          ) || bAddresses[0];

        const defaultShipTo =
          sAddresses.find(
            (a) => a.addressName.toLowerCase() === defaults.shipToDef?.trim().toLowerCase(),
          ) || sAddresses[0];

        return {
          code: p.code,
          name: p.name,
          currency: p.currency,
          phone: p.phone,
          email: p.email,
          billToAddress: defaultBillTo?.addressText || p.billToAddress || "",
          shipToAddress: defaultShipTo?.addressText || p.shipToAddress || "",
          addresses: entry.addresses,
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
