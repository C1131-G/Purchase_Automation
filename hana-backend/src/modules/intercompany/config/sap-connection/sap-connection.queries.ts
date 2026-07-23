import {
  getIcSqlClient,
  toBool,
  toNumber,
  toString,
  type IcSqlClient,
} from "@/modules/intercompany/infrastructure/ic-sql";

import type { IcSapConnection } from "./sap-connection.types";

const mapRow = (row: Record<string, unknown>): IcSapConnection => ({
  companyId: toNumber(row.COMPANY_ID ?? row.companyId),
  connectionId: toNumber(row.CONNECTION_ID ?? row.connectionId),
  databaseName: toString(row.DATABASE_NAME ?? row.databaseName),
  isActive: toBool(row.IS_ACTIVE ?? row.isActive),
  isDefault: toBool(row.IS_DEFAULT ?? row.isDefault),
  licenseServer:
    row.LICENSE_SERVER === null || row.LICENSE_SERVER === undefined
      ? null
      : toString(row.LICENSE_SERVER),
  password: toString(row.PASSWORD ?? row.password),
  server: row.SERVER === null || row.SERVER === undefined ? null : toString(row.SERVER),
  serviceLayerUrl: toString(row.SERVICE_LAYER_URL ?? row.serviceLayerUrl),
  username: toString(row.USERNAME ?? row.username),
});

export type SapConnectionQueries = {
  getDefaultConnection: (companyId: number) => Promise<IcSapConnection | null>;
};

export const createSapConnectionQueries = (
  sql: IcSqlClient = getIcSqlClient(),
): SapConnectionQueries => ({
  getDefaultConnection: async (companyId) => {
    const rows = await sql.query(
      `SELECT "CONNECTION_ID", "COMPANY_ID", "SERVER", "SERVICE_LAYER_URL",
              "DATABASE_NAME", "LICENSE_SERVER", "USERNAME", "PASSWORD",
              "IS_DEFAULT", "IS_ACTIVE"
         FROM "IC_SAP_CONNECTION"
        WHERE "COMPANY_ID" = ?
          AND "IS_ACTIVE" = 1
        ORDER BY "IS_DEFAULT" DESC, "CONNECTION_ID" ASC`,
      [companyId],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  },
});

export const sapConnectionQueries = createSapConnectionQueries();
