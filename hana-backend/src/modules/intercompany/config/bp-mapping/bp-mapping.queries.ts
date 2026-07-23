import {
  getIcSqlClient,
  toBool,
  toNumber,
  toString,
  type IcSqlClient,
} from "@/modules/intercompany/infrastructure/ic-sql";

import type { IcBpMapping } from "./bp-mapping.types";

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

export type BpMappingQueries = {
  findByBuyerAndVendorCode: (
    buyerCompanyId: number,
    vendorCode: string,
  ) => Promise<IcBpMapping | null>;
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
});

export const bpMappingQueries = createBpMappingQueries();
