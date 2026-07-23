import {
  getIcSqlClient,
  toNumber,
  toString,
  type IcSqlClient,
} from "@/modules/intercompany/infrastructure/ic-sql";

import type { IcConfiguration } from "./configuration.types";

const mapRow = (row: Record<string, unknown>): IcConfiguration => ({
  configId: toNumber(row.CONFIG_ID ?? row.configId),
  configKey: toString(row.CONFIG_KEY ?? row.configKey),
  configValue: toString(row.CONFIG_VALUE ?? row.configValue),
  description:
    row.DESCRIPTION === null || row.DESCRIPTION === undefined ? null : toString(row.DESCRIPTION),
});

export type ConfigurationQueries = {
  getByKey: (key: string) => Promise<IcConfiguration | null>;
};

export const createConfigurationQueries = (
  sql: IcSqlClient = getIcSqlClient(),
): ConfigurationQueries => ({
  getByKey: async (key) => {
    const rows = await sql.query(
      `SELECT "CONFIG_ID", "CONFIG_KEY", "CONFIG_VALUE", "DESCRIPTION"
         FROM "IC_CONFIGURATION"
        WHERE "CONFIG_KEY" = ?`,
      [key],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  },
});

export const configurationQueries = createConfigurationQueries();
