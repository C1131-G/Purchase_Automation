import {
  getIcSqlClient,
  toBool,
  toNumber,
  toString,
  type IcSqlClient,
} from "@/modules/intercompany/infrastructure/ic-sql";

import type { IcBpMapping, IcBpMappingWithCompanies } from "./bp-mapping.types";

const mapRow = (row: Record<string, unknown>): IcBpMapping => ({
  buyerCompanyId: toNumber(row.BUYER_COMPANY_ID ?? row.buyerCompanyId),
  buyerCustomerCode: toString(row.BUYER_CUSTOMER_CODE ?? row.buyerCustomerCode),
  isActive: toBool(row.IS_ACTIVE ?? row.isActive),
  mappingId: toNumber(row.MAPPING_ID ?? row.mappingId),
  remarks:
    row.REMARKS === null || row.REMARKS === undefined ? null : toString(row.REMARKS ?? row.remarks),
  vendorCode: toString(row.VENDOR_CODE ?? row.vendorCode),
  vendorCompanyId: toNumber(row.VENDOR_COMPANY_ID ?? row.vendorCompanyId),
});

const mapRowWithCompanies = (row: Record<string, unknown>): IcBpMappingWithCompanies => {
  const base = mapRow(row);
  const buyerNameRaw = row.BUYER_COMPANY_NAME ?? row.buyerCompanyName;
  const vendorNameRaw = row.VENDOR_COMPANY_NAME ?? row.vendorCompanyName;
  return {
    ...base,
    buyerCompanyName:
      buyerNameRaw === null || buyerNameRaw === undefined || buyerNameRaw === ""
        ? null
        : toString(buyerNameRaw),
    vendorCompanyName:
      vendorNameRaw === null || vendorNameRaw === undefined || vendorNameRaw === ""
        ? null
        : toString(vendorNameRaw),
  };
};

export type BpMappingQueries = {
  findByBuyerAndVendorCode: (
    buyerCompanyId: number,
    vendorCode: string,
  ) => Promise<IcBpMapping | null>;
  /** Active mappings where the company is buyer or seller (vendor company). */
  listActiveForCompany: (companyId: number) => Promise<IcBpMappingWithCompanies[]>;
};

export const createBpMappingQueries = (sql: IcSqlClient = getIcSqlClient()): BpMappingQueries => ({
  findByBuyerAndVendorCode: async (buyerCompanyId, vendorCode) => {
    const rows = await sql.query(
      `SELECT "MAPPING_ID", "BUYER_COMPANY_ID", "VENDOR_COMPANY_ID",
              "VENDOR_CODE", "BUYER_CUSTOMER_CODE", "IS_ACTIVE", "REMARKS"
         FROM "IC_BP_MAPPING"
        WHERE "BUYER_COMPANY_ID" = ?
          AND "VENDOR_CODE" = ?
          AND "IS_ACTIVE" = 1`,
      [buyerCompanyId, vendorCode],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  },

  listActiveForCompany: async (companyId) => {
    const rows = await sql.query(
      `SELECT m."MAPPING_ID", m."BUYER_COMPANY_ID", m."VENDOR_COMPANY_ID",
              m."VENDOR_CODE", m."BUYER_CUSTOMER_CODE", m."IS_ACTIVE", m."REMARKS",
              bc."COMPANY_NAME" AS "BUYER_COMPANY_NAME",
              vc."COMPANY_NAME" AS "VENDOR_COMPANY_NAME"
         FROM "IC_BP_MAPPING" m
         LEFT JOIN "IC_COMPANY" bc ON bc."COMPANY_ID" = m."BUYER_COMPANY_ID"
         LEFT JOIN "IC_COMPANY" vc ON vc."COMPANY_ID" = m."VENDOR_COMPANY_ID"
        WHERE m."IS_ACTIVE" = 1
          AND (m."BUYER_COMPANY_ID" = ? OR m."VENDOR_COMPANY_ID" = ?)
        ORDER BY m."MAPPING_ID"`,
      [companyId, companyId],
    );
    return rows.map(mapRowWithCompanies);
  },
});

export const bpMappingQueries = createBpMappingQueries();
