import type { IcSapConnection } from "@/modules/intercompany/config/sap-connection/sap-connection.types";

export type ResolveSlTargetResult = {
  companyId: number;
  connection: IcSapConnection;
  /** How to obtain an SL session for this target. */
  sessionStrategy: "reuse_or_login";
};
