// Master Data Service: Centralized logic for retrieving organizational lookup data (Products, Partners, Tax, etc.) from SAP HANA.

import { Brackets, In } from "typeorm";
import type { EntitySchema, FindManyOptions, ObjectLiteral } from "typeorm";

import { logger } from "@/core/logger/pino-logger";
import { getCachedData } from "@/core/utils/cache";
import { getTenantRepository } from "@/dal/tenant-dal.helper";
import { executeTenantQuery } from "@/dal/tenant-dal.helper";
import { AdminSettingsSchema } from "@/db/schemas/admin-settings.schema";
import { BusinessPartnerAddressSchema } from "@/db/schemas/business-partner-address.schema";
import type { BusinessPartnerAddress } from "@/db/schemas/business-partner-address.schema";
import { BusinessPartnerSchema } from "@/db/schemas/business-partner.schema";
import { ItemPriceSchema } from "@/db/schemas/item-price.schema";
import { ItemWarehouseStockSchema } from "@/db/schemas/item-warehouse-stock.schema";
import { ItemSchema } from "@/db/schemas/item.schema";
import { SalesEmployeeSchema } from "@/db/schemas/sales-employee.schema";
import { TaxGroupSchema } from "@/db/schemas/tax-group.schema";
import { UnitOfMeasurementSchema } from "@/db/schemas/unit-of-measurement.schema";
import { WarehouseSchema } from "@/db/schemas/warehouse.schema";

// Generic helper function that wraps TypeORM repository lookups with a tenant-aware caching layer.
const fetchLookup = async <T extends ObjectLiteral>(
  dbName: string,
  Schema: EntitySchema<T>,
  entityName: string,
  options: FindManyOptions<T> = {},
): Promise<T[]> => {
  const cacheKey = `master:${dbName}:${entityName}`;

  // Master data changes infrequently in SAP, so a 10-minute cache TTL is used to minimize database load.
  return getCachedData(
    cacheKey,
    async () => {
      try {
        const repository = await getTenantRepository(dbName, Schema);
        const results = await repository.find(options);
        logger.info({
          count: results?.length,
          msg: `Lookups fetched: ${entityName}`,
        });
        return results || [];
      } catch (err: unknown) {
        const caughtError = err instanceof Error ? err : new Error(String(err));
        logger.error({
          db: dbName,
          error: caughtError.message,
          msg: `Failed to fetch ${entityName} from HANA`,
        });
        const dbError = new Error(
          `Failed to retrieve ${entityName}: ${caughtError.message}`,
        ) as Error & {
          statusCode?: number;
        };
        dbError.statusCode = 500;

        throw dbError;
      }
    },
    1000 * 60 * 10,
  );
};

const toTrimmed = (value: unknown): string => (typeof value === "string" ? value.trim() : "");
const toNullableInt = (value: unknown): number | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return undefined;
    }
    return Math.trunc(value);
  }
  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) {
      return undefined;
    }
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) {
      return undefined;
    }
    return Math.trunc(parsed);
  }
  return undefined;
};
const toNumberOrZero = (value: unknown): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string") {
    const normalized = value.replaceAll(",", "").trim();
    if (!normalized) {
      return 0;
    }
    const parsedFromString = Number(normalized);
    return Number.isFinite(parsedFromString) ? parsedFromString : 0;
  }
  if (value && typeof value === "object") {
    const rawString = String(value).trim();
    if (rawString && rawString !== "[object Object]") {
      const parsedFromObjectString = Number(rawString);
      if (Number.isFinite(parsedFromObjectString)) {
        return parsedFromObjectString;
      }
    }
    const record = value as Record<string, unknown>;
    const nested = record.value ?? record.Value ?? record.amount ?? record.Amount;
    if (nested !== undefined) {
      return toNumberOrZero(nested);
    }
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatAddress = (row: BusinessPartnerAddress): string => {
  const parts = [
    toTrimmed(row.Street),
    toTrimmed(row.Block),
    toTrimmed(row.City),
    toTrimmed(row.State),
    toTrimmed(row.ZipCode),
    toTrimmed(row.Country),
  ].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(", ");
  }
  return toTrimmed(row.Address);
};

const fetchBusinessPartnerAddresses = async (
  dbName: string,
  partnerCodes: string[],
  defaultsMap?: Map<string, { billToDef?: string; shipToDef?: string }>,
) => {
  if (partnerCodes.length === 0) {
    return new Map<
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
  }

  const repository = await getTenantRepository(dbName, BusinessPartnerAddressSchema);
  const rows = await repository.find({
    order: { CardCode: "ASC" } as Record<string, "ASC" | "DESC">,
    select: [
      "CardCode",
      "AdresType",
      "Address",
      "Street",
      "Block",
      "City",
      "ZipCode",
      "State",
      "Country",
    ] as const,
    where: {
      CardCode: In(partnerCodes),
      AdresType: In(["B", "S"]),
    } as Record<string, unknown>,
  });
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

  for (const row of rows) {
    const cardCode = toTrimmed(row.CardCode);
    const addressType = toTrimmed(row.AdresType).toUpperCase();
    const addressName = toTrimmed(row.Address);
    if (!cardCode || (addressType !== "B" && addressType !== "S")) {
      continue;
    }

    const formattedAddress = formatAddress(row);
    if (!formattedAddress) {
      continue;
    }

    const current = addressMap.get(cardCode) ?? { addresses: [] };
    const defaults = defaultsMap?.get(cardCode);
    const isDefaultBillTo = defaults?.billToDef
      ? addressName.toLowerCase() === defaults.billToDef.trim().toLowerCase()
      : !current.billToAddress;
    const isDefaultShipTo = defaults?.shipToDef
      ? addressName.toLowerCase() === defaults.shipToDef.trim().toLowerCase()
      : !current.shipToAddress;

    if (addressType === "B" && (isDefaultBillTo || !current.billToAddress)) {
      current.billToAddress = formattedAddress;
    }
    if (addressType === "S" && (isDefaultShipTo || !current.shipToAddress)) {
      current.shipToAddress = formattedAddress;
    }
    const isDuplicate = current.addresses.some(
      (addr) => addr.addressText.trim().toLowerCase() === formattedAddress.trim().toLowerCase(),
    );
    if (!isDuplicate) {
      current.addresses.push({
        addressName: toTrimmed(row.Address),
        addressType: addressType as "B" | "S",
        addressText: formattedAddress,
      });
    }
    addressMap.set(cardCode, current);
  }

  return addressMap;
};

const fetchSalesEmployeeNames = async (dbName: string, slpCodes: number[]) => {
  if (slpCodes.length === 0) {
    return new Map<number, string>();
  }

  const repository = await getTenantRepository(dbName, SalesEmployeeSchema);
  const rows = await repository.find({
    select: ["SlpCode", "SlpName"] as const,
    where: { SlpCode: In(slpCodes), Active: "Y" } as Record<string, unknown>,
  });

  const salesEmployeeMap = new Map<number, string>();
  for (const row of rows) {
    const code = toNumberOrZero(row.SlpCode);
    const name = toTrimmed(row.SlpName);
    if (code > 0 && name) {
      salesEmployeeMap.set(code, name);
    }
  }

  return salesEmployeeMap;
};

// Fetches the product catalog with warehouse-aware stock.
export const getProducts = async (
  dbName: string,
  warehouseCode?: string,
  search?: string,
  limit?: number,
  type?: "sales" | "purchase",
  priceList?: number,
) => {
  const normalizedWarehouseCode = toTrimmed(warehouseCode);
  const normalizedSearch = toTrimmed(search);
  const cacheSearchKey = normalizedSearch ? normalizedSearch.toLowerCase() : "all";
  const resolvedLimit =
    typeof limit === "number" && Number.isFinite(limit)
      ? Math.max(1, Math.min(500, limit))
      : undefined;
  const defaultListLimit = 100;

  // We use a more granular cache key to ensure that partial lookups don't collide.
  const cacheLimitToken = normalizedSearch
    ? resolvedLimit !== undefined
      ? String(resolvedLimit)
      : "unlimited"
    : String(resolvedLimit ?? defaultListLimit);
  const priceListToken = priceList !== undefined ? String(priceList) : "default";
  const cacheKey = `master:${dbName}:Products:v11:${normalizedWarehouseCode || "default"}:${cacheSearchKey}:${cacheLimitToken}:${type || "default"}:pl${priceListToken}`;

  return getCachedData(
    cacheKey,
    async () => {
      // Step 1: Pre-fetch setup data with independent caches so product search misses don't re-fetch static lookups.
      const [adminSettings, taxGroups, uoms, ugpLines] = await Promise.all([
        getCachedData(
          `master:${dbName}:AdminSettings`,
          async () => {
            const repository = await getTenantRepository(dbName, AdminSettingsSchema);
            const rows = await repository.find({
              select: ["Code", "MainCurncy"] as const,
              take: 1,
            });
            return rows[0] ?? null;
          },
          1000 * 60 * 60,
        ),
        getCachedData(
          `master:${dbName}:TaxGroups:active`,
          async () => {
            const repository = await getTenantRepository(dbName, TaxGroupSchema);
            return repository.find({
              select: ["Code", "Rate"] as const,
              where: { Inactive: "N" } as Record<string, unknown>,
            });
          },
          1000 * 60 * 30,
        ),
        getCachedData(
          `master:${dbName}:UoMs`,
          async () => {
            const repository = await getTenantRepository(dbName, UnitOfMeasurementSchema);
            return repository.find({
              select: ["UomEntry", "UomCode", "UomName"] as const,
            });
          },
          1000 * 60 * 60,
        ),
        // Fetch all UoM Group lines (UGP1 joined with OUOM) so each product
        // can expose its full set of valid UoMs, matching what SAP B1 shows.
        getCachedData(
          `master:${dbName}:UgpLines`,
          async () => {
            try {
              const rows = (await executeTenantQuery(
                dbName,
                `SELECT ugp."UgpEntry", ugp."UomEntry", ouom."UomCode", ouom."UomName"
                 FROM UGP1 ugp
                 INNER JOIN OUOM ouom ON ugp."UomEntry" = ouom."UomEntry"
                 WHERE ugp."IsActive" = 'Y'`,
              )) as Array<{
                UgpEntry: unknown;
                UomEntry: unknown;
                UomCode: unknown;
                UomName: unknown;
              }>;
              return rows;
            } catch {
              return [];
            }
          },
          1000 * 60 * 60,
        ),
      ]);

      // Step 2: Fetch Item headers based on search and limit.
      const repository = await getTenantRepository(dbName, ItemSchema);
      const query = repository
        .createQueryBuilder("item")
        .select([
          "item.ItemCode",
          "item.ItemName",
          "item.SalUnitMsr",
          "item.BuyUnitMsr",
          "item.AvgPrice",
          "item.LstEvlPric",
          "item.LastPurPrc",
          "item.LastPurCur",
          "item.VatGroupPu",
          "item.VatGroupSa",
          "item.DfltWH",
          "item.UgpEntry",
        ])
        .where("item.frozenFor = :active", { active: "N" });

      // Filter by item type: sales items only show SellItem='Y', purchase items only show PrchseItem='Y'
      if (type === "sales") {
        query.andWhere("item.SellItem = :sellItem", { sellItem: "Y" });
      } else if (type === "purchase") {
        query.andWhere("item.PrchseItem = :prchseItem", { prchseItem: "Y" });
      }

      if (normalizedSearch) {
        const words = normalizedSearch.split(/\s+/).filter(Boolean);
        words.forEach((word, index) => {
          const lowerWord = word.toLowerCase();
          query.andWhere(
            new Brackets((qb) => {
              qb.where("LOWER(item.ItemCode) LIKE :word_" + index, {
                ["word_" + index]: `%${lowerWord}%`,
              }).orWhere("LOWER(item.ItemName) LIKE :word_" + index, {
                ["word_" + index]: `%${lowerWord}%`,
              });
            }),
          );
        });
      }

      // Default sorting: if no search, sort by ItemCode.
      // Pagination: only apply limits when NOT searching.
      query.orderBy("item.ItemCode", "ASC");
      if (!normalizedSearch) {
        if (resolvedLimit !== undefined) {
          query.take(resolvedLimit);
        } else {
          query.take(defaultListLimit);
        }
      }

      const items = await query.getMany();
      if (items.length === 0) {
        return [];
      }

      const itemCodes = items.map((item) => toTrimmed(item.ItemCode)).filter(Boolean);

      // Step 3: Fetch related Stock and Price data ONLY for the identified items.
      // This is the CRITICAL optimization that prevents full table scans of OITW and ITM1.
      const [itemStocks, itemPrices] = await Promise.all([
        (async () => {
          const stockRepository = await getTenantRepository(dbName, ItemWarehouseStockSchema);
          const stockQuery = stockRepository
            .createQueryBuilder("stock")
            .select("stock.ItemCode", "ItemCode")
            .addSelect("SUM(stock.OnHand)", "OnHand")
            .where("stock.ItemCode IN (:...itemCodes)", { itemCodes })
            .groupBy("stock.ItemCode");

          if (normalizedWarehouseCode) {
            stockQuery.andWhere("stock.WhsCode = :warehouseCode", {
              warehouseCode: normalizedWarehouseCode,
            });
          }
          return stockQuery.getRawMany<{
            ItemCode?: unknown;
            OnHand?: unknown;
          }>();
        })(),
        (async () => {
          // Special SAP price lists: -1 = Last Purchase Price, -2 = Last Evaluated (AvgPrice).
          // These are not in ITM1 — they come from OITM fields.
          // For any regular price list, filter ITM1 by that PriceList number.
          if (priceList === -1 || priceList === -2) {
            // Will be resolved from item.LastPurPrc or item.AvgPrice directly — no ITM1 query needed.
            return [];
          }
          const priceRepository = await getTenantRepository(dbName, ItemPriceSchema);
          const priceWhere: Record<string, unknown> = {
            ItemCode: In(itemCodes),
          };
          if (priceList !== undefined && priceList >= 0) {
            priceWhere.PriceList = priceList;
          }
          return priceRepository.find({
            select: ["ItemCode", "PriceList", "Price"] as const,
            where: priceWhere,
          });
        })(),
      ]);

      const stockMap = new Map<string, number>();
      for (const stockRow of itemStocks) {
        const itemCode = toTrimmed(stockRow.ItemCode);
        if (itemCode) {
          stockMap.set(itemCode, toNumberOrZero(stockRow.OnHand));
        }
      }

      const priceMap = new Map<string, number>();
      if (priceList === -1) {
        // Last Purchase Price: use OITM.LastPurPrc for each item, fallback to AvgPrice if 0
        for (const item of items) {
          const itemCode = toTrimmed(item.ItemCode);
          if (itemCode) {
            const lastPurPrc = toNumberOrZero(
              (item as unknown as Record<string, unknown>).LastPurPrc,
            );
            priceMap.set(itemCode, lastPurPrc > 0 ? lastPurPrc : toNumberOrZero(item.AvgPrice));
          }
        }
      } else if (priceList === -2) {
        // Last Evaluated Price: use OITM.LstEvlPric with a fallback to AvgPrice
        for (const item of items) {
          const itemCode = toTrimmed(item.ItemCode);
          if (itemCode) {
            const evalPrice = toNumberOrZero(
              (item as unknown as Record<string, unknown>).LstEvlPric,
            );
            const avgPrice = toNumberOrZero(item.AvgPrice);
            const finalPrice = evalPrice > 0 ? evalPrice : avgPrice;
            priceMap.set(itemCode, finalPrice);
          }
        }
      } else {
        // Regular price list or no filter: pick from ITM1 (highest price as fallback if multiple rows)
        for (const priceRow of itemPrices) {
          const itemCode = toTrimmed(priceRow.ItemCode);
          if (!itemCode) continue;
          const candidatePrice = toNumberOrZero(priceRow.Price);
          if (priceList !== undefined) {
            // Specific price list selected: use it directly
            priceMap.set(itemCode, candidatePrice);
          } else {
            // No price list selected: fallback to highest across all lists
            const currentPrice = priceMap.get(itemCode) ?? 0;
            if (candidatePrice > currentPrice) {
              priceMap.set(itemCode, candidatePrice);
            }
          }
        }
      }

      let defaultCurrency = toTrimmed(adminSettings?.MainCurncy);
      if (!defaultCurrency || defaultCurrency === "$") {
        defaultCurrency = "FJD";
      }
      const taxRateByCode = new Map<string, number>();
      for (const taxGroup of taxGroups) {
        const code = toTrimmed(taxGroup.Code);
        if (code) {
          taxRateByCode.set(code, toNumberOrZero(taxGroup.Rate));
        }
      }

      const uomByNormalizedValue = new Map<string, { code: string; entry?: number }>();
      for (const uom of uoms) {
        const code = toTrimmed(uom.UomCode);
        const name = toTrimmed(uom.UomName);
        const entry = toNullableInt(
          (uom as unknown as Record<string, unknown>).UomEntry ??
            (uom as unknown as Record<string, unknown>).AbsEntry,
        );
        if (code) {
          uomByNormalizedValue.set(code.toLowerCase(), { code, entry });
        }
        if (name && code) {
          uomByNormalizedValue.set(name.toLowerCase(), { code, entry });
        }
      }

      // Build a map from UgpEntry -> list of { code, name, entry } for fast lookup.
      const ugpUomMap = new Map<number, { code: string; name: string; entry?: number }[]>();
      for (const ugpLine of ugpLines) {
        const ugpEntry = toNullableInt(ugpLine.UgpEntry);
        if (ugpEntry === undefined || ugpEntry === -1) {
          continue;
        }
        const uomCode = toTrimmed(ugpLine.UomCode);
        const uomName = toTrimmed(ugpLine.UomName) || uomCode;
        const uomEntry = toNullableInt(ugpLine.UomEntry);
        if (!uomCode) {
          continue;
        }
        const list = ugpUomMap.get(ugpEntry) ?? [];
        if (!list.some((u) => u.code === uomCode)) {
          list.push({ code: uomCode, name: uomName, entry: uomEntry });
        }
        ugpUomMap.set(ugpEntry, list);
      }

      const mappedItems = items.map((item) => {
        const normalizedItemCode = toTrimmed(item.ItemCode);
        const resolvedStock = stockMap.get(normalizedItemCode) ?? 0;
        // If no price in the map, fall back to AvgPrice on the item (moving average)
        const resolvedPrice = priceMap.get(normalizedItemCode) ?? toNumberOrZero(item.AvgPrice);
        const resolvedCurrency = defaultCurrency || "";

        // Selection: Default to Sales if type is not specified or set to 'sales'.
        // This ensures the portal primarily behaves as a sales application unless explicitly in a purchase flow.
        const resolvedTaxCode =
          type === "purchase"
            ? toTrimmed(item.VatGroupPu) || toTrimmed(item.VatGroupSa)
            : toTrimmed(item.VatGroupSa) || toTrimmed(item.VatGroupPu);

        const resolvedTaxRate = taxRateByCode.get(resolvedTaxCode) ?? 0;
        const salesUomText = toTrimmed(item.SalUnitMsr);
        const purchaseUomText = toTrimmed(item.BuyUnitMsr);
        const resolvedSalesUom = uomByNormalizedValue.get(salesUomText.toLowerCase());
        const resolvedSalesUomCode = resolvedSalesUom?.code || salesUomText;
        const resolvedSalesUomEntry = resolvedSalesUom?.entry;
        const resolvedPurchaseUom = uomByNormalizedValue.get(purchaseUomText.toLowerCase());
        const resolvedPurchaseUomCode = resolvedPurchaseUom?.code || resolvedSalesUomCode;
        const resolvedPurchaseUomEntry = resolvedPurchaseUom?.entry ?? resolvedSalesUomEntry;

        // Determine the valid UoM list for this item from its UoM Group.
        const itemUgpEntry = toNullableInt((item as unknown as Record<string, unknown>).UgpEntry);
        let uomList: { code: string; name: string; entry?: number }[] = [];
        if (itemUgpEntry !== undefined && itemUgpEntry !== -1) {
          uomList = ugpUomMap.get(itemUgpEntry) ?? [];
        }
        // Fallback: ensure at least the purchase and sales UoMs appear in the list.
        if (uomList.length === 0) {
          if (resolvedPurchaseUomCode) {
            uomList.push({
              code: resolvedPurchaseUomCode,
              name: resolvedPurchaseUomCode,
              entry: resolvedPurchaseUomEntry,
            });
          }
          if (resolvedSalesUomCode && resolvedSalesUomCode !== resolvedPurchaseUomCode) {
            uomList.push({
              code: resolvedSalesUomCode,
              name: resolvedSalesUomCode,
              entry: resolvedSalesUomEntry,
            });
          }
        }

        return {
          Currency: resolvedCurrency,
          ItemCode: normalizedItemCode,
          ItemName: item.ItemName,
          OnHand: resolvedStock,
          Price: resolvedPrice,
          PurchaseUoMCode: resolvedPurchaseUomCode,
          PurchaseUoMEntry: resolvedPurchaseUomEntry,
          PurchaseUom: purchaseUomText,
          TaxCode: resolvedTaxCode,
          TaxRate: resolvedTaxRate,
          UoMCode: resolvedSalesUomCode,
          UoMEntry: resolvedSalesUomEntry,
          UoMName:
            uomList.find((u) => u.code === resolvedSalesUomCode)?.name ?? resolvedSalesUomCode,
          Uom: salesUomText,
          UomList: uomList,
          Warehouse: normalizedWarehouseCode || item.DfltWH || "",
          id: normalizedItemCode,
          productCode: normalizedItemCode,
          productName: item.ItemName,
          stock: resolvedStock,
          taxCode: resolvedTaxCode,
          taxRate: resolvedTaxRate,
        };
      });

      return mappedItems;
    },
    1000 * 60 * 10,
  );
};

export const getProductWarehouseStocks = async (dbName: string, itemCode: string) => {
  const normalizedItemCode = toTrimmed(itemCode);
  if (!normalizedItemCode) {
    const error = new Error("itemCode is required") as Error & {
      statusCode?: number;
    };
    error.statusCode = 400;
    throw error;
  }

  const cacheKey = `master:${dbName}:ProductWarehouseStocks:${normalizedItemCode}`;

  return getCachedData(
    cacheKey,
    async () => {
      const [warehouses, stockRows] = await Promise.all([
        fetchLookup(dbName, WarehouseSchema, "Warehouses", {
          order: { WhsCode: "ASC" } as Record<string, "ASC" | "DESC">,
          select: ["WhsCode", "WhsName"] as const,
          where: { Inactive: "N" } as Record<string, unknown>,
        }),
        (async () => {
          const repository = await getTenantRepository(dbName, ItemWarehouseStockSchema);
          return repository.find({
            select: ["WhsCode", "OnHand"] as const,
            where: { ItemCode: normalizedItemCode } as Record<string, unknown>,
          });
        })(),
      ]);

      const stockMap = new Map<string, number>();
      for (const stockRow of stockRows) {
        const whsCode = toTrimmed(stockRow.WhsCode);
        if (!whsCode) {
          continue;
        }
        stockMap.set(whsCode, toNumberOrZero(stockRow.OnHand));
      }

      return warehouses.map((warehouse) => {
        const code = toTrimmed(warehouse.WhsCode);
        return {
          code,
          name: toTrimmed(warehouse.WhsName),
          stock: stockMap.get(code) ?? 0,
        };
      });
    },
    1000 * 60 * 5,
  );
};

// Fetches active Vendors (Business Partners with type 'S' = Supplier).
// OCRD.CardType is the source of truth ('S' for vendors/suppliers, 'C' for customers).
// OCRD.SlpCode refers to Sales Employee (for customers) or Buyer (for vendors), both joining to OSLP.
export const getVendors = async (dbName: string) => {
  const adminSettingsRepo = await getTenantRepository(dbName, AdminSettingsSchema);
  const settingsRows = await adminSettingsRepo.find({
    select: ["MainCurncy"],
    take: 1,
  });
  const adminSettings = settingsRows[0] ?? null;
  const rawMainCurncy = toTrimmed(adminSettings?.MainCurncy);
  const defaultCurrency = rawMainCurncy && rawMainCurncy !== "$" ? rawMainCurncy : "FJD";

  const results = await fetchLookup(dbName, BusinessPartnerSchema, "Vendors:v3", {
    order: { CardCode: "ASC" } as Record<string, "ASC" | "DESC">,
    select: [
      "CardCode",
      "CardName",
      "Address",
      "Currency",
      "SlpCode",
      "BillToDef",
      "ShipToDef",
    ] as const,
    where: { CardType: "S", frozenFor: "N" } as Record<string, unknown>,
  });
  const vendorCodes = results.map((item) => item.CardCode).filter(Boolean);
  const salesEmployeeCodes = [
    ...new Set(
      results
        .map((item) => toNullableInt(item.SlpCode))
        .filter((code): code is number => code !== undefined),
    ),
  ];

  const defaultsMap = new Map<string, { billToDef?: string; shipToDef?: string }>();
  for (const item of results) {
    if (item.CardCode) {
      defaultsMap.set(toTrimmed(item.CardCode), {
        billToDef: item.BillToDef,
        shipToDef: item.ShipToDef,
      });
    }
  }

  const [vendorAddressMap, salesEmployeeMap] = await Promise.all([
    fetchBusinessPartnerAddresses(dbName, vendorCodes, defaultsMap),
    fetchSalesEmployeeNames(dbName, salesEmployeeCodes),
  ]);

  return results.map((item) => {
    const normalizedCardCode = toTrimmed(item.CardCode);
    const slpCode = toNullableInt(item.SlpCode);
    return {
      id: normalizedCardCode,
      CardCode: normalizedCardCode,
      CardName: item.CardName,
      Address: item.Address,
      Currency:
        item.Currency && toTrimmed(item.Currency) !== "$"
          ? toTrimmed(item.Currency)
          : defaultCurrency,
      SlpCode: item.SlpCode,
      // Aliases for frontend components expecting generic keys.
      code: normalizedCardCode,
      name: item.CardName,
      billToAddress: vendorAddressMap.get(normalizedCardCode)?.billToAddress ?? item.Address ?? "",
      shipToAddress:
        vendorAddressMap.get(normalizedCardCode)?.shipToAddress ??
        vendorAddressMap.get(normalizedCardCode)?.billToAddress ??
        item.Address ??
        "",
      addresses: vendorAddressMap.get(normalizedCardCode)?.addresses ?? [],
      salesEmployeeCode: slpCode,
      salesEmployeeName: slpCode !== undefined ? (salesEmployeeMap.get(slpCode) ?? "") : "",
    };
  });
};

// Fetches active Customers (Business Partners with type 'C' = Customer).
// OCRD.CardType is the source of truth ('C' for customers, 'S' for vendors/suppliers).
// OCRD.SlpCode refers to Sales Employee (for customers) or Buyer (for vendors), both joining to OSLP.
export const getCustomers = async (dbName: string) => {
  const adminSettingsRepo = await getTenantRepository(dbName, AdminSettingsSchema);
  const settingsRows = await adminSettingsRepo.find({
    select: ["MainCurncy"],
    take: 1,
  });
  const adminSettings = settingsRows[0] ?? null;
  const rawMainCurncy = toTrimmed(adminSettings?.MainCurncy);
  const defaultCurrency = rawMainCurncy && rawMainCurncy !== "$" ? rawMainCurncy : "FJD";

  const results = await fetchLookup(dbName, BusinessPartnerSchema, "Customers:v3", {
    order: { CardCode: "ASC" } as Record<string, "ASC" | "DESC">,
    select: [
      "CardCode",
      "CardName",
      "Address",
      "Currency",
      "SlpCode",
      "BillToDef",
      "ShipToDef",
    ] as const,
    where: { CardType: "C", frozenFor: "N" } as Record<string, unknown>,
  });
  const customerCodes = results.map((item) => item.CardCode).filter(Boolean);
  const salesEmployeeCodes = [
    ...new Set(
      results
        .map((item) => toNullableInt(item.SlpCode))
        .filter((code): code is number => code !== undefined),
    ),
  ];

  const defaultsMap = new Map<string, { billToDef?: string; shipToDef?: string }>();
  for (const item of results) {
    if (item.CardCode) {
      defaultsMap.set(toTrimmed(item.CardCode), {
        billToDef: item.BillToDef,
        shipToDef: item.ShipToDef,
      });
    }
  }

  const [customerAddressMap, salesEmployeeMap] = await Promise.all([
    fetchBusinessPartnerAddresses(dbName, customerCodes, defaultsMap),
    fetchSalesEmployeeNames(dbName, salesEmployeeCodes),
  ]);

  return results.map((item) => {
    const normalizedCardCode = toTrimmed(item.CardCode);
    const slpCode = toNullableInt(item.SlpCode);
    return {
      Address: item.Address,
      CardCode: normalizedCardCode,
      CardName: item.CardName,
      Currency:
        item.Currency && toTrimmed(item.Currency) !== "$"
          ? toTrimmed(item.Currency)
          : defaultCurrency,
      SlpCode: item.SlpCode,
      billToAddress:
        customerAddressMap.get(normalizedCardCode)?.billToAddress ?? item.Address ?? "",
      code: normalizedCardCode,
      id: normalizedCardCode,
      name: item.CardName,
      salesEmployeeCode: slpCode,
      salesEmployeeName: slpCode !== undefined ? (salesEmployeeMap.get(slpCode) ?? "") : "",
      shipToAddress:
        customerAddressMap.get(normalizedCardCode)?.shipToAddress ??
        customerAddressMap.get(normalizedCardCode)?.billToAddress ??
        item.Address ??
        "",
      addresses: customerAddressMap.get(normalizedCardCode)?.addresses ?? [],
    };
  });
};

// Retrieves active tax groups (VAT types/rates) defined in SAP.
export const getTaxCodes = async (dbName: string) => {
  const results = await fetchLookup(dbName, TaxGroupSchema, "Tax Codes", {
    order: { Code: "ASC" } as Record<string, "ASC" | "DESC">,
    select: ["Code", "Name", "Rate"] as const,
    where: { Inactive: "N" } as Record<string, unknown>,
  });

  return results.map((item) => ({
    Code: item.Code,
    Name: item.Name,
    Rate: item.Rate,
    code: item.Code,
    id: item.Code,
    name: item.Name,
  }));
};

// Fetches the global list of Units of Measurement (UoM).
export const getUOMs = async (dbName: string) => {
  const results = await fetchLookup(dbName, UnitOfMeasurementSchema, "UOMs", {
    order: { UomCode: "ASC" } as Record<string, "ASC" | "DESC">,
    select: ["UomCode", "UomName", "UomEntry"] as const,
  });

  return results.map((item) => ({
    Code: item.UomCode,
    Name: item.UomName,
    UomEntry: item.UomEntry,
    code: item.UomCode,
    id: item.UomCode,
    name: item.UomName,
    uomEntry: item.UomEntry,
  }));
};

// Fetches the list of price lists from the OPLN table using direct SQL for reliability.
export const getPriceLists = async (dbName: string) => {
  const cacheKey = `master:${dbName}:PriceLists`;
  return getCachedData(
    cacheKey,
    async () => {
      try {
        const rows = (await executeTenantQuery(
          dbName,
          `SELECT "ListNum", "ListName" FROM OPLN ORDER BY "ListNum" ASC`,
        )) as Array<{ ListNum: unknown; ListName: unknown }>;

        const fromDb = rows
          .filter((row) => row.ListName && String(row.ListName).trim())
          .map((row) => ({
            Code: String(row.ListNum ?? ""),
            Name: toTrimmed(row.ListName),
            code: String(row.ListNum ?? ""),
            id: String(row.ListNum ?? ""),
            name: toTrimmed(row.ListName),
            listNum: typeof row.ListNum === "number" ? row.ListNum : Number(row.ListNum),
          }));

        // SAP special built-in price lists (not stored in OPLN)
        const specialPriceLists = [
          {
            Code: "-2",
            Name: "Last Evaluated Price",
            code: "-2",
            id: "-2",
            name: "Last Evaluated Price",
            listNum: -2,
          },
          {
            Code: "-1",
            Name: "Last Purchase Price",
            code: "-1",
            id: "-1",
            name: "Last Purchase Price",
            listNum: -1,
          },
        ];

        return [...specialPriceLists, ...fromDb];
      } catch (err) {
        logger.warn({
          db: dbName,
          err,
          msg: "Failed to fetch price lists from OPLN",
        });
        return [];
      }
    },
    1000 * 60 * 10,
  );
};

// Fetches document numbering series from the NNM1 table filtered by object type.
// Uses direct HANA query — no SAP Service Layer session required.
export const getSeries = async (dbName: string, documentType: string) => {
  const cacheKey = `master:${dbName}:Series:${documentType}`;
  return getCachedData(
    cacheKey,
    async () => {
      try {
        const rows = (await executeTenantQuery(
          dbName,
          `SELECT "Series", "SeriesName", "ObjectCode", "Locked"
           FROM NNM1
           WHERE "ObjectCode" = '${documentType}'
             AND "Locked" = 'N'
           ORDER BY "Series" ASC`,
        )) as Array<{
          Series: unknown;
          SeriesName: unknown;
          ObjectCode: unknown;
          Locked: unknown;
        }>;

        return rows
          .filter((row) => row.SeriesName && String(row.SeriesName).trim())
          .map((row) => ({
            Series: Number(row.Series),
            Name: toTrimmed(row.SeriesName),
            code: String(row.Series ?? ""),
            id: String(row.Series ?? ""),
            name: toTrimmed(row.SeriesName),
          }));
      } catch (err) {
        logger.warn({
          db: dbName,
          documentType,
          err,
          msg: "Failed to fetch series from NNM1",
        });
        return [];
      }
    },
    1000 * 60 * 10,
  );
};

// Lists active warehouses available for inventory storage and transactions.
export const getWarehouses = async (dbName: string) => {
  const results = await fetchLookup(dbName, WarehouseSchema, "Warehouses", {
    order: { WhsCode: "ASC" } as Record<string, "ASC" | "DESC">,
    select: ["WhsCode", "WhsName", "BinActivat"] as const,
    where: { Inactive: "N" } as Record<string, unknown>,
  });

  return results.map((item) => ({
    Code: item.WhsCode,
    Name: item.WhsName,
    code: item.WhsCode,
    id: item.WhsCode,
    name: item.WhsName,
    enableBinLocations: item.BinActivat === "Y",
  }));
};

// Fetches bin locations for a warehouse directly from OBIN via HANA.
// Uses executeTenantQuery — no SAP Service Layer session required.
export const getWarehouseBins = async (dbName: string, warehouseCode: string) => {
  const cacheKey = `master:${dbName}:Bins:${warehouseCode}`;
  return getCachedData(
    cacheKey,
    async () => {
      try {
        const rows = (await executeTenantQuery(
          dbName,
          `SELECT "AbsEntry", "BinCode", "WhsCode", "Descr"
           FROM OBIN
           WHERE "WhsCode" = '${warehouseCode}'
             AND "Disabled" = 'N'
           ORDER BY "BinCode" ASC`,
        )) as Array<{
          AbsEntry: unknown;
          BinCode: unknown;
          WhsCode: unknown;
          Descr: unknown;
        }>;

        return rows.map((row) => ({
          AbsEntry: Number(row.AbsEntry),
          BinCode: String(row.BinCode ?? ""),
          WhsCode: String(row.WhsCode ?? ""),
          Description: toTrimmed(row.Descr),
        }));
      } catch (err) {
        logger.warn({
          db: dbName,
          err,
          msg: "Failed to fetch bins from OBIN",
          warehouseCode,
        });
        return [];
      }
    },
    1000 * 60 * 5, // 5 min cache
  );
};

export const masterDataService = {
  getCustomers,
  getPriceLists,
  getProductWarehouseStocks,
  getProducts,
  getSeries,
  getTaxCodes,
  getUOMs,
  getVendors,
  getWarehouses,
  getWarehouseBins,
};
