import {
  getIcSqlClient,
  toBool,
  toNumber,
  toString,
  type IcSqlClient,
} from "@/modules/intercompany/infrastructure/ic-sql";

import type { IcTaxMapping } from "./tax-mapping.types";

const mapRow = (row: Record<string, unknown>): IcTaxMapping => ({
  isActive: toBool(row.IS_ACTIVE ?? row.isActive),
  sourceCompanyId: toNumber(row.SOURCE_COMPANY_ID ?? row.sourceCompanyId),
  sourceTaxCode: toString(row.SOURCE_TAX_CODE ?? row.sourceTaxCode),
  targetCompanyId: toNumber(row.TARGET_COMPANY_ID ?? row.targetCompanyId),
  targetTaxCode: toString(row.TARGET_TAX_CODE ?? row.targetTaxCode),
  taxMapId: toNumber(row.TAX_MAP_ID ?? row.taxMapId),
});

export type TaxMappingQueries = {
  findMapping: (
    sourceCompanyId: number,
    targetCompanyId: number,
    sourceTaxCode: string,
  ) => Promise<IcTaxMapping | null>;
};

export const createTaxMappingQueries = (
  sql: IcSqlClient = getIcSqlClient(),
): TaxMappingQueries => ({
  findMapping: async (sourceCompanyId, targetCompanyId, sourceTaxCode) => {
    const rows = await sql.query(
      `SELECT "TAX_MAP_ID", "SOURCE_COMPANY_ID", "TARGET_COMPANY_ID",
              "SOURCE_TAX_CODE", "TARGET_TAX_CODE", "IS_ACTIVE"
         FROM "IC_TAX_MAPPING"
        WHERE "SOURCE_COMPANY_ID" = ?
          AND "TARGET_COMPANY_ID" = ?
          AND "SOURCE_TAX_CODE" = ?
          AND "IS_ACTIVE" = 1`,
      [sourceCompanyId, targetCompanyId, sourceTaxCode],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  },
});

export const taxMappingQueries = createTaxMappingQueries();
