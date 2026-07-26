import https from "node:https";

import axios from "axios";

import type { IcSapConnection } from "@/modules/intercompany/config/sap-connection/sap-connection.types";

import type { IcSlSessionRecord } from "./ic-sl.types";

export type IcSlHttpRequest = {
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  endpoint: string;
  body?: unknown;
  session: IcSlSessionRecord;
  connection: IcSapConnection;
  /** Extra SL headers (e.g. B1S-ReplaceCollectionsOnPatch). */
  headers?: Record<string, string>;
};

export type IcSlHttpResponse<T = unknown> = {
  status: number;
  data: T;
};

const buildCookieHeader = (session: IcSlSessionRecord): string => {
  const parts = [`B1SESSION=${session.sessionToken}`];
  if (session.routeId) {
    parts.push(`ROUTEID=${session.routeId}`);
  }
  return parts.join("; ");
};

const defaultRequest = async <T>(req: IcSlHttpRequest): Promise<IcSlHttpResponse<T>> => {
  const baseURL = req.connection.serviceLayerUrl.replace(/\/+$/, "");
  const path = req.endpoint.startsWith("/") ? req.endpoint : `/${req.endpoint}`;
  const response = await axios.request<T>({
    baseURL,
    data: req.body,
    headers: {
      Cookie: buildCookieHeader(req.session),
      "Content-Type": "application/json",
      ...req.headers,
    },
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    method: req.method,
    timeout: 60_000,
    url: path,
    validateStatus: () => true,
  });

  if (response.status < 200 || response.status >= 300) {
    const data = response.data as { error?: { message?: { value?: string } | string } };
    const sapMessage =
      typeof data?.error?.message === "object"
        ? data.error.message?.value
        : typeof data?.error?.message === "string"
          ? data.error.message
          : undefined;
    throw new Error(
      sapMessage
        ? `IC SL ${req.method} ${path} failed (${response.status}): ${sapMessage}`
        : `IC SL ${req.method} ${path} failed with status ${response.status}`,
    );
  }

  return {
    data: response.data,
    status: response.status,
  };
};

/**
 * Low-level IC Service Layer HTTP client (cookie session from IC_SL_SESSION).
 * Inject `requestFn` in tests.
 */
export const createIcSlClient = (deps?: {
  requestFn?: <T>(req: IcSlHttpRequest) => Promise<IcSlHttpResponse<T>>;
}) => {
  const requestFn = deps?.requestFn ?? defaultRequest;

  return {
    request: <T>(req: IcSlHttpRequest) => requestFn<T>(req),
  };
};

export type IcSlClient = ReturnType<typeof createIcSlClient>;

export const icSlClient = createIcSlClient();
