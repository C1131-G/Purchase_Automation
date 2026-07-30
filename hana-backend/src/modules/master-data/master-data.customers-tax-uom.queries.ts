import { logger } from "@/core/logger/pino-logger";
import { getCachedData } from "@/core/utils/cache";
import { getTenantRepository, executeTenantQuery } from "@/db/tenant-query";
import { getDisplayCurrency, resolveCurrencyCode } from "@/services/currency-format";
import { AdminSettingsSchema } from "@/db/schemas/admin-settings.schema";
import { BusinessPartnerSchema } from "@/db/schemas/business-partner.schema";
import { TaxGroupSchema } from "@/db/schemas/tax-group.schema";
import { UnitOfMeasurementSchema } from "@/db/schemas/unit-of-measurement.schema";
import { fetchLookup, toTrimmed, toNullableInt } from "./master-data.lookup-cache";
import {
  fetchBusinessPartnerAddresses,
  fetchSalesEmployeeNames,
} from "./master-data.partner-lookup";
export const getCustomers = async (dbName: string) => {
  const adminSettingsRepo = await getTenantRepository(dbName, AdminSettingsSchema);
  const settingsRows = await adminSettingsRepo.find({
    select: ["MainCurncy"],
    take: 1,
  });
  const adminSettings = settingsRows[0] ?? null;
  // OADM first; env DEFAULT_CURRENCY_CODE if admin missing/"$" / fails.
  const defaultCurrency = resolveCurrencyCode(
    adminSettings?.MainCurncy,
    await getDisplayCurrency(dbName),
  );

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
      Currency: resolveCurrencyCode(item.Currency, defaultCurrency),
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
