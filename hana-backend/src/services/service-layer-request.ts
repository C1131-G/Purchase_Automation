import axios from "axios";
import type { AxiosInstance, AxiosRequestConfig } from "axios";

import { logger } from "@/core/logger/pino-logger";
import { normalizeEndpointGroup } from "@/core/observability/attributes";
import {
  recordSapSlError,
  recordSapSlRefresh,
  recordSapSlRequest,
} from "@/core/observability/metrics";
import { withSpan } from "@/core/observability/tracing";
import { extractSessionId } from "@/core/utils/cookie-parser";
import type { SLError, SLSessionInfo } from "@/services/types/service-layer.types";

export type ServiceLayerHost = {
  client: AxiosInstance | null;
  sessions: Map<string, SLSessionInfo>;
  sessionCredentials: Map<string, { companyDB: string; username: string; password: string }>;
  refreshLocks: Map<string, Promise<void>>;
  destroyLocalSession: (sessionId: string, reason?: string) => void;
  request: <T>(
    sessionId: string,
    method: string,
    endpoint: string,
    data?: unknown,
    allowUnauthorizedRetry?: boolean,
    customHeaders?: Record<string, string>,
  ) => Promise<T>;
};

export async function loginToSap(
  host: ServiceLayerHost,
  companyDB: string,
  username: string,
  password: string,
) {
  if (!host.client) {
    throw new Error("Service Layer client not initialized");
  }

  const start = process.hrtime.bigint();
  return withSpan("sap.sl.login", { "sap.endpoint_group": "Login" }, async () => {
    try {
      const response = await host.client!.post("/Login", {
        CompanyDB: companyDB,
        Password: password,
        UserName: username,
      });

      const cookies: string[] = response.headers["set-cookie"] || [];
      const sapSessionId = extractSessionId(cookies);

      if (!sapSessionId) {
        throw new Error("No session ID received from Service Layer");
      }

      const cookieString = cookies.map((cookie) => cookie.split(";")[0]).join("; ");
      const durationSec = Number(process.hrtime.bigint() - start) / 1e9;
      recordSapSlRequest("POST", "Login", String(response.status || 200), durationSec);

      return {
        cookieString,
        cookies,
        sapSessionId,
        sessionTimeout: (response.data as Record<string, unknown>).SessionTimeout as number,
        version: (response.data as Record<string, unknown>).Version as string,
      };
    } catch (err) {
      const durationSec = Number(process.hrtime.bigint() - start) / 1e9;
      recordSapSlRequest("POST", "Login", "error", durationSec);
      recordSapSlError("Login", "login_failed");
      throw err;
    }
  });
}

export async function refreshSessionAfterUnauthorized(host: ServiceLayerHost, sessionId: string) {
  const existingRefresh = host.refreshLocks.get(sessionId);
  if (existingRefresh) {
    await existingRefresh;
    return;
  }

  const refreshPromise = (async () => {
    const sessionInfo = host.sessions.get(sessionId);
    const credentials = host.sessionCredentials.get(sessionId);

    if (!sessionInfo || !credentials) {
      throw new Error("Cannot refresh SAP session: missing local session or credentials");
    }

    const sapLogin = await loginToSap(
      host,
      credentials.companyDB,
      credentials.username,
      credentials.password,
    );

    sessionInfo.sessionId = sapLogin.sapSessionId;
    sessionInfo.cookies = sapLogin.cookies;
    sessionInfo.cookieString = sapLogin.cookieString;
    sessionInfo.loginTime = Date.now();
    sessionInfo.lastSapCall = Date.now();

    logger.info({
      msg: "Service Layer session refreshed after 401",
      sessionId,
    });
  })();

  host.refreshLocks.set(sessionId, refreshPromise);

  try {
    await refreshPromise;
    recordSapSlRefresh("success");
  } catch (err) {
    recordSapSlRefresh("fail");
    throw err;
  } finally {
    host.refreshLocks.delete(sessionId);
  }
}

export async function executeServiceLayerRequest<T>(
  host: ServiceLayerHost,
  sessionId: string,
  method: string,
  endpoint: string,
  data: unknown = null,
  allowUnauthorizedRetry: boolean = true,
  customHeaders?: Record<string, string>,
): Promise<T> {
  if (!host.client) {
    throw new Error("Service Layer client not initialized");
  }

  const sessionInfo = host.sessions.get(sessionId);

  if (!sessionInfo || !sessionInfo.cookieString) {
    const error = new Error("Invalid or expired session") as SLError;
    error.statusCode = 401;
    throw error;
  }

  sessionInfo.lastSapCall = Date.now();
  const endpointGroup = normalizeEndpointGroup(endpoint);
  const start = process.hrtime.bigint();

  return withSpan(
    "sap.sl.request",
    {
      "http.method": method,
      "sap.endpoint_group": endpointGroup,
    },
    async (span) => {
      const cookieString = sessionInfo.cookieString ?? "";
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Cookie: cookieString,
      };

      if (customHeaders) {
        for (const [key, value] of Object.entries(customHeaders)) {
          if (key.toLowerCase() === "content-type") {
            delete headers["Content-Type"];
          }
          headers[key] = value;
        }
      }

      if (data instanceof FormData) {
        delete headers["Content-Type"];
      }

      const requestConfig: AxiosRequestConfig = {
        headers,
        method,
        url: endpoint,
      };

      if (data) {
        requestConfig.data = data;
      }

      try {
        const response = await host.client!(requestConfig);
        const durationSec = Number(process.hrtime.bigint() - start) / 1e9;
        const status = String(response.status || 200);
        span.setAttribute("http.status_code", response.status || 200);
        recordSapSlRequest(method, endpointGroup, status, durationSec);
        return response.data as T;
      } catch (err: unknown) {
        const durationSec = Number(process.hrtime.bigint() - start) / 1e9;
        if (axios.isAxiosError(err)) {
          const statusCode = err.response?.status;
          const message = err.response?.data?.error?.message?.value || err.message;
          recordSapSlRequest(method, endpointGroup, String(statusCode || "error"), durationSec);
          recordSapSlError(endpointGroup, statusCode === 401 ? "unauthorized" : "http_error");
          span.setAttribute("http.status_code", statusCode || 0);

          const buildSessionExpiredError = () => {
            const sessionError = new Error("SAP session expired") as SLError;
            sessionError.statusCode = 401;
            sessionError.isSessionExpired = true;
            return sessionError;
          };

          if (statusCode === 401) {
            if (allowUnauthorizedRetry) {
              try {
                await refreshSessionAfterUnauthorized(host, sessionId);
              } catch (refreshError: unknown) {
                logger.warn({
                  msg: "Service Layer silent re-login failed after 401",
                  sessionId,
                  endpoint,
                  err:
                    refreshError instanceof Error ? refreshError : new Error(String(refreshError)),
                });
                host.destroyLocalSession(sessionId, "SAP 401 Unauthorized");
                throw buildSessionExpiredError();
              }

              const refreshedSession = host.sessions.get(sessionId);
              if (refreshedSession?.cookieString) {
                try {
                  return await host.request<T>(sessionId, method, endpoint, data, false);
                } catch (retryError: unknown) {
                  const retryStatus = axios.isAxiosError(retryError)
                    ? retryError.response?.status
                    : (retryError as SLError | undefined)?.statusCode;

                  if (retryStatus === 401) {
                    logger.warn({
                      msg: "Service Layer request still unauthorized after silent re-login",
                      sessionId,
                      endpoint,
                      err: retryError instanceof Error ? retryError : new Error(String(retryError)),
                    });
                    host.destroyLocalSession(sessionId, "SAP 401 Unauthorized");
                    throw buildSessionExpiredError();
                  }
                  throw retryError instanceof Error ? retryError : new Error(String(retryError));
                }
              }
            }

            host.destroyLocalSession(sessionId, "SAP 401 Unauthorized");
            throw buildSessionExpiredError();
          }

          const customErr = new Error(message) as SLError;
          customErr.statusCode = statusCode || 500;
          throw customErr;
        }
        recordSapSlRequest(method, endpointGroup, "error", durationSec);
        recordSapSlError(endpointGroup, "unknown");
        throw err instanceof Error ? err : new Error(String(err));
      }
    },
  );
}
