import { getCachedData } from "@/core/utils/cache";
import { getDb } from "@/db/client";

import {
  getProductWarehouseStocks,
  getProducts,
  type ProductFilters,
} from "./master-data.products";
import { masterDataRepository } from "./master-data.repository";

export type { ProductFilters };
export { getProductWarehouseStocks, getProducts };

const tenMinutes = 1000 * 60 * 10;

const getPartners = (partnerType: string, search?: string) => {
  const cacheKey = `master:${partnerType}:${search ?? ""}`;

  return getCachedData(
    cacheKey,
    async () => {
      const db = getDb();
      return masterDataRepository.findPartnersByTypeAndSearch(db, partnerType, search);
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
  const businessPartner = await masterDataRepository.findBusinessPartnerName(db, cardCode.trim());
  return businessPartner?.name ?? null;
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
