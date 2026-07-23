import { createSapConnectionQueries, type SapConnectionQueries } from "./sap-connection.queries";
import type { IcSapConnection } from "./sap-connection.types";

export type SapConnectionService = {
  getDefaultConnection: (companyId: number) => Promise<IcSapConnection | null>;
};

export const createSapConnectionService = (
  queries: SapConnectionQueries = createSapConnectionQueries(),
): SapConnectionService => ({
  getDefaultConnection: (companyId) => queries.getDefaultConnection(companyId),
});

export const sapConnectionService = createSapConnectionService();
