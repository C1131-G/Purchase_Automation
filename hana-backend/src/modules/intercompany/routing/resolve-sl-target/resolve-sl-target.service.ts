import type { SapConnectionService } from "@/modules/intercompany/config/sap-connection/sap-connection.service";
import { createSapConnectionService } from "@/modules/intercompany/config/sap-connection/sap-connection.service";
import { IC_LOG_SCOPE, icLog } from "@/modules/intercompany/infrastructure/ic-logger";

import type { ResolveSlTargetResult } from "./resolve-sl-target.types";

export type ResolveSlTargetService = {
  resolve: (companyId: number) => Promise<ResolveSlTargetResult | null>;
};

export const createResolveSlTargetService = (deps?: {
  sapConnection?: SapConnectionService;
}): ResolveSlTargetService => {
  const sapConnection = deps?.sapConnection ?? createSapConnectionService();

  return {
    resolve: async (companyId) => {
      const connection = await sapConnection.getDefaultConnection(companyId);
      if (!connection) {
        icLog.warn(IC_LOG_SCOPE.SL, "No active IC_SAP_CONNECTION for company", {
          check: "sl_connection",
          companyId,
          outcome: "fail",
        });
        return null;
      }

      icLog.debug(IC_LOG_SCOPE.SL, "IC_SAP_CONNECTION resolved", {
        check: "sl_connection",
        companyId,
        connectionId: connection.connectionId,
        databaseName: connection.databaseName,
        outcome: "pass",
      });

      return {
        companyId,
        connection,
        sessionStrategy: "reuse_or_login",
      };
    },
  };
};

export const resolveSlTargetService = createResolveSlTargetService();
