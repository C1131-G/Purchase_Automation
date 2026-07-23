import type { SapConnectionService } from "@/modules/intercompany/config/sap-connection/sap-connection.service";
import { createSapConnectionService } from "@/modules/intercompany/config/sap-connection/sap-connection.service";

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
        return null;
      }
      return {
        companyId,
        connection,
        sessionStrategy: "reuse_or_login",
      };
    },
  };
};

export const resolveSlTargetService = createResolveSlTargetService();
