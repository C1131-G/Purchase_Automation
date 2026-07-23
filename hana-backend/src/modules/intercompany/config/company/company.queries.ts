import {
  getIcSqlClient,
  toBool,
  toNullableNumber,
  toNumber,
  toString,
  type IcSqlClient,
} from "@/modules/intercompany/infrastructure/ic-sql";

import type { IcCompany } from "./company.types";

type CompanyRow = Record<string, unknown>;

const mapRow = (row: CompanyRow): IcCompany => ({
  companyCode: toString(row.COMPANY_CODE ?? row.companyCode),
  companyId: toNumber(row.COMPANY_ID ?? row.companyId),
  companyName: toString(row.COMPANY_NAME ?? row.companyName),
  defaultBranchId: toNullableNumber(row.DEFAULT_BRANCH_ID ?? row.defaultBranchId),
  isActive: toBool(row.IS_ACTIVE ?? row.isActive),
  sapDbName: toString(row.SAP_DB_NAME ?? row.sapDbName),
});

export type CompanyQueries = {
  getById: (companyId: number) => Promise<IcCompany | null>;
  getBySapDbName: (sapDbName: string) => Promise<IcCompany | null>;
  listActive: () => Promise<IcCompany[]>;
};

export const createCompanyQueries = (sql: IcSqlClient = getIcSqlClient()): CompanyQueries => ({
  getById: async (companyId) => {
    const rows = await sql.query(
      `SELECT "COMPANY_ID", "COMPANY_CODE", "COMPANY_NAME", "SAP_DB_NAME",
              "DEFAULT_BRANCH_ID", "IS_ACTIVE"
         FROM "IC_COMPANY"
        WHERE "COMPANY_ID" = ?`,
      [companyId],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  },

  getBySapDbName: async (sapDbName) => {
    const rows = await sql.query(
      `SELECT "COMPANY_ID", "COMPANY_CODE", "COMPANY_NAME", "SAP_DB_NAME",
              "DEFAULT_BRANCH_ID", "IS_ACTIVE"
         FROM "IC_COMPANY"
        WHERE "SAP_DB_NAME" = ?`,
      [sapDbName],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  },

  listActive: async () => {
    const rows = await sql.query(
      `SELECT "COMPANY_ID", "COMPANY_CODE", "COMPANY_NAME", "SAP_DB_NAME",
              "DEFAULT_BRANCH_ID", "IS_ACTIVE"
         FROM "IC_COMPANY"
        WHERE "IS_ACTIVE" = 1
        ORDER BY "COMPANY_ID"`,
    );
    return rows.map(mapRow);
  },
});

export const companyQueries = createCompanyQueries();
