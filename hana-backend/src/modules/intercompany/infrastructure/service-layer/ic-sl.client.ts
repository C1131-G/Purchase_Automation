import type { IcSapConnection } from "@/modules/intercompany/config/sap-connection/sap-connection.types";
import type { IcSlSessionRecord } from "./ic-sl.types";

export type IcSlHttpRequest = {
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  endpoint: string;
  body?: unknown;
  session: IcSlSessionRecord;
  connection: IcSapConnection;
};

export type IcSlHttpResponse<T = unknown> = {
  status: number;
  data: T;
};

/**
 * Low-level IC Service Layer HTTP client.
 * P3: contract only — real axios wiring in P5 with session cookies.
 */
export const createIcSlClient = (deps?: {
  requestFn?: <T>(req: IcSlHttpRequest) => Promise<IcSlHttpResponse<T>>;
}) => {
  const requestFn =
    deps?.requestFn ??
    (async <T>(_req: IcSlHttpRequest): Promise<IcSlHttpResponse<T>> => {
      throw new Error("Not implemented: ic-sl.client request (P5)");
    });

  return {
    request: <T>(req: IcSlHttpRequest) => requestFn<T>(req),
  };
};

export const icSlClient = createIcSlClient();
