import { and, eq, inArray, like, or, sql } from "drizzle-orm";

import { businessPartnerAddresses } from "@/db/schema/business-partner-addresses";
import { businessPartners } from "@/db/schema/business-partners";
import { chartOfAccounts } from "@/db/schema/chart-of-accounts";
import { itemPrices } from "@/db/schema/item-prices";
import { itemWarehouseStock } from "@/db/schema/item-warehouse-stock";
import { items } from "@/db/schema/items";
import { priceLists } from "@/db/schema/price-lists";
import { salesEmployees } from "@/db/schema/sales-employees";
import { taxGroups } from "@/db/schema/tax-groups";
import { unitOfMeasurements } from "@/db/schema/unit-of-measurements";
import { warehouses } from "@/db/schema/warehouses";
import type { LooseDb, LooseWhere } from "@/types/db.types";
import type { DynRow } from "@/types/drizzle.types";

export const masterDataRepository = {
  async findActiveProducts(db: LooseDb, conditions: LooseWhere, limit: number) {
    return db
      .select({
        avgPrice: items.avgPrice,
        barcode: items.barcode,
        code: items.code,
        defaultWarehouse: items.defaultWarehouse,
        foreignName: items.foreignName,
        inventoryUom: items.inventoryUom,
        lastPurchasePrice: items.lastPurchasePrice,
        name: items.name,
      })
      .from(items)
      .where(conditions)
      .limit(limit);
  },

  async findWarehouseStockByItemCodes(db: LooseDb, codes: string[], warehouseCode?: string) {
    if (warehouseCode) {
      return db
        .select({
          itemCode: itemWarehouseStock.itemCode,
          qty: itemWarehouseStock.onHand,
        })
        .from(itemWarehouseStock)
        .where(
          and(
            inArray(itemWarehouseStock.itemCode, codes),
            eq(itemWarehouseStock.warehouseCode, warehouseCode),
          ),
        );
    }
    return db
      .select({
        itemCode: itemWarehouseStock.itemCode,
        qty: itemWarehouseStock.onHand,
      })
      .from(itemWarehouseStock)
      .where(inArray(itemWarehouseStock.itemCode, codes));
  },

  async findPricesByItemCodes(db: LooseDb, codes: string[], priceList: number) {
    return db
      .select({
        itemCode: itemPrices.itemCode,
        price: itemPrices.price,
      })
      .from(itemPrices)
      .where(and(inArray(itemPrices.itemCode, codes), eq(itemPrices.priceList, priceList)));
  },

  async findProductWarehouseStocks(db: LooseDb, itemCode: string) {
    return db
      .select({
        onHand: itemWarehouseStock.onHand,
        warehouseCode: warehouses.code,
        warehouseName: warehouses.name,
      })
      .from(itemWarehouseStock)
      .innerJoin(warehouses, eq(itemWarehouseStock.warehouseCode, warehouses.code))
      .where(and(eq(itemWarehouseStock.itemCode, itemCode), eq(warehouses.inactive, false)));
  },

  async findPartnersByTypeAndSearch(db: LooseDb, type: string, search?: string) {
    const conditions = and(
      eq(businessPartners.type, type),
      eq(businessPartners.frozen, false),
      search
        ? or(like(businessPartners.code, `%${search}%`), like(businessPartners.name, `%${search}%`))
        : undefined,
    );

    const partners = await db.select().from(businessPartners).where(conditions);

    if (partners.length === 0) {
      return [];
    }

    const codes = partners.map((p: DynRow) => p.code);
    const addresses = await db
      .select()
      .from(businessPartnerAddresses)
      .where(
        sql`${businessPartnerAddresses.cardCode} = ANY(${sql.raw(`ARRAY[${codes.map((c: string) => `'${c.replaceAll("'", "''")}'`).join(",")}]`)})`,
      );

    const slpCodes = partners
      .map((p: DynRow) => p.salesEmployeeCode)
      .filter(
        (code: number | null | undefined): code is number => code !== null && code !== undefined,
      );

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
        addresses: {
          addressName: string;
          addressType: "B" | "S";
          addressText: string;
        }[];
      }
    >();

    for (const addr of addresses) {
      const { cardCode } = addr;
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
          addressText: formattedAddress,
          addressType: (addr.addressType || "B") as "B" | "S",
        });
      }
    }

    return partners.map((p: DynRow) => {
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
        Address: p.billToAddress || "",
        CardCode: p.code,
        CardName: p.name,
        Currency: p.currency,
        SalesEmployeeCode: p.salesEmployeeCode,
        SalesEmployeeName: salesEmployeeName,
        SlpCode: p.salesEmployeeCode,
        addresses: entry.addresses,
        billToAddress: defaultBillTo?.addressText || p.billToAddress || "",
        code: p.code,
        currency: p.currency,
        email: p.email,
        id: p.code,
        name: p.name,
        phone: p.phone,
        salesEmployeeCode: p.salesEmployeeCode,
        salesEmployeeName,
        shipToAddress:
          defaultShipTo?.addressText || defaultBillTo?.addressText || p.shipToAddress || "",
      };
    });
  },

  async findActiveTaxGroups(db: LooseDb) {
    return db
      .select({
        code: taxGroups.code,
        name: taxGroups.name,
        rate: taxGroups.rate,
      })
      .from(taxGroups)
      .where(eq(taxGroups.inactive, false));
  },

  async findAllUnitOfMeasurements(db: LooseDb) {
    return db.select().from(unitOfMeasurements);
  },

  async findAllPriceLists(db: LooseDb) {
    return db.select().from(priceLists);
  },

  async findActiveWarehouses(db: LooseDb) {
    return db.select().from(warehouses).where(eq(warehouses.inactive, false));
  },

  async findActiveSalesEmployees(db: LooseDb) {
    return db.select().from(salesEmployees).where(eq(salesEmployees.active, true));
  },

  async findAllChartOfAccounts(db: LooseDb) {
    return db.select().from(chartOfAccounts);
  },

  async findBusinessPartnerName(db: LooseDb, cardCode: string) {
    const [row] = await db
      .select({ name: businessPartners.name })
      .from(businessPartners)
      .where(eq(businessPartners.code, cardCode))
      .limit(1);
    return row || null;
  },
};
