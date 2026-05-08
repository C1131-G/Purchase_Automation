// SAP Business One Service Layer Client: High-level HTTP controller for interacting with the SAP B1 REST API. Manages session persistence, automatic retries using exponential backoff, and binary file transmissions.

import https from "node:https";

import axios from "axios";
import type { AxiosInstance, AxiosRequestConfig } from "axios";
import axiosRetry from "axios-retry";

import { logger } from "@/core/logger/pino-logger";
import { extractSessionId } from "@/core/utils/cookie-parser.utils";
import type { SLError, SLSessionInfo } from "@/services/types/service-layer.types";

class ServiceLayerClient {
  private httpsAgent: https.Agent | null = null;
  private client: AxiosInstance | null = null;
  // Maps application-internal session IDs to SAP-native cookies and metadata.
  private sessions = new Map<string, SLSessionInfo>();
  // Stores credentials required for silent SAP re-login on 401.
  private sessionCredentials = new Map<
    string,
    { companyDB: string; username: string; password: string }
  >();
  // Prevents concurrent 401 bursts from triggering multiple SAP logins for the same app session.
  private refreshLocks = new Map<string, Promise<void>>();

  private async loginToSap(companyDB: string, username: string, password: string) {
    if (!this.client) {
      throw new Error("Service Layer client not initialized");
    }

    const response = await this.client.post("/Login", {
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

    return {
      cookieString,
      cookies,
      sapSessionId,
      sessionTimeout: (response.data as Record<string, unknown>).SessionTimeout as number,
      version: (response.data as Record<string, unknown>).Version as string,
    };
  }

  // Configures the underlying Axios client. In development, SSL verification is often disabled for self-signed SAP containers.
  initialize(serviceLayerURL: string, rejectUnauthorized: boolean = false) {
    this.httpsAgent = new https.Agent({
      rejectUnauthorized,
    });

    this.client = axios.create({
      baseURL: serviceLayerURL,
      httpsAgent: this.httpsAgent,
      timeout: 30_000,
    });

    // Implements resilient communication. Retries 5xx errors which are common during high-load SAP transactions.
    axiosRetry(this.client, {
      onRetry: (retryCount, error, requestConfig) => {
        logger.warn({
          msg: "Service Layer retry",
          attempt: retryCount,
          url: requestConfig.url,
          error: error.message,
        });
      },
      retries: 2,
      retryCondition: (error) => {
        const shouldRetry =
          axiosRetry.isNetworkOrIdempotentRequestError(error) ||
          (!!error.response && error.response.status >= 500);
        return shouldRetry;
      },
      retryDelay: axiosRetry.exponentialDelay,
    });

    logger.info({
      msg: "Service Layer initialized",
      service_Layer_URL: serviceLayerURL,
      ssl_verify: rejectUnauthorized,
    });
  }

  // Authenticates against the /Login endpoint. Captures the B1SESSION and ROUTEID cookies essential for load-balanced SAP environments.
  async login(
    companyDB: string,
    username: string,
    password: string,
  ): Promise<{ sessionId: string; version: string; sessionTimeout: number }> {
    if (!this.client) {
      throw new Error("Service Layer client not initialized");
    }

    try {
      const sapLogin = await this.loginToSap(companyDB, username, password);

      const sessionInfo: SLSessionInfo = {
        companyDB,
        cookieString: sapLogin.cookieString,
        cookies: sapLogin.cookies,
        lastSapCall: Date.now(),
        loginTime: Date.now(),
        sessionId: sapLogin.sapSessionId,
        username,
      };

      this.sessions.set(sapLogin.sapSessionId, sessionInfo);
      this.sessionCredentials.set(sapLogin.sapSessionId, {
        companyDB,
        password,
        username,
      });

      logger.info({
        companyDB,
        msg: "Service Layer session created",
        sessionId: sapLogin.sapSessionId,
        username,
      });

      return {
        sessionId: sapLogin.sapSessionId,
        sessionTimeout: sapLogin.sessionTimeout,
        version: sapLogin.version,
      };
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        // Normalizes SAP's nested error structure for easier handling in higher-order services.
        const message = err.response?.data?.error?.message?.value || "Service Layer login failed";
        const customErr = new Error(message) as SLError;
        customErr.statusCode = err.response?.status || 500;
        customErr.errorCode = err.response?.data?.error?.code;
        throw customErr;
      }
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  // Generic request wrapper that injects session cookies and handles global error patterns (like 401 expiry).
  async request<T>(
    sessionId: string,
    method: string,
    endpoint: string,
    data: unknown = null,
    allowUnauthorizedRetry: boolean = true,
  ): Promise<T> {
    if (!this.client) {
      throw new Error("Service Layer client not initialized");
    }

    const sessionInfo = this.sessions.get(sessionId);

    if (!sessionInfo || !sessionInfo.cookieString) {
      const error = new Error("Invalid or expired session") as SLError;
      error.statusCode = 401;
      throw error;
    }

    // Slide the inactivity window.
    sessionInfo.lastSapCall = Date.now();

    const requestConfig: AxiosRequestConfig = {
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionInfo.cookieString,
      },
      method,
      url: endpoint,
    };

    if (data) {
      requestConfig.data = data;
    }

    try {
      const response = await this.client(requestConfig);
      return response.data as T;
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const statusCode = err.response?.status;
        const message = err.response?.data?.error?.message?.value || err.message;
        const buildSessionExpiredError = () => {
          const sessionError = new Error("SAP session expired") as SLError;
          sessionError.statusCode = 401;
          sessionError.isSessionExpired = true;
          return sessionError;
        };

        // 401 recovery mode: one silent re-login + one retry.
        if (statusCode === 401) {
          if (allowUnauthorizedRetry) {
            try {
              await this.refreshSessionAfterUnauthorized(sessionId);
            } catch (refreshError: unknown) {
              const refreshMessage =
                refreshError instanceof Error ? refreshError.message : String(refreshError);
              logger.warn({
                msg: "Service Layer silent re-login failed after 401",
                sessionId,
                endpoint,
                error: refreshMessage,
              });
              this.destroyLocalSession(sessionId, "SAP 401 Unauthorized");
              throw buildSessionExpiredError();
            }

            const refreshedSession = this.sessions.get(sessionId);
            if (refreshedSession?.cookieString) {
              try {
                return await this.request<T>(sessionId, method, endpoint, data, false);
              } catch (retryError: unknown) {
                const retryStatus = axios.isAxiosError(retryError)
                  ? retryError.response?.status
                  : (retryError as SLError | undefined)?.statusCode;

                // Only treat repeated 401 as an auth failure; propagate functional SAP errors as-is.
                if (retryStatus === 401) {
                  const retryMessage =
                    retryError instanceof Error ? retryError.message : String(retryError);
                  logger.warn({
                    msg: "Service Layer request still unauthorized after silent re-login",
                    sessionId,
                    endpoint,
                    error: retryMessage,
                  });
                  this.destroyLocalSession(sessionId, "SAP 401 Unauthorized");
                  throw buildSessionExpiredError();
                }
                throw retryError instanceof Error ? retryError : new Error(String(retryError));
              }
            }
          }

          this.destroyLocalSession(sessionId, "SAP 401 Unauthorized");
          throw buildSessionExpiredError();
        }

        const customErr = new Error(message) as SLError;
        customErr.statusCode = statusCode || 500;
        throw customErr;
      }
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  // Gracefully terminates the session on the SAP server and clears local state.
  async logout(sessionId: string): Promise<void> {
    if (!this.client) {
      return;
    }
    const sessionInfo = this.sessions.get(sessionId);
    if (!sessionInfo) {
      return;
    }

    try {
      // Best-effort logout attempt. SAP might have already killed the session.
      await this.client
        .post("/Logout", null, {
          headers: { Cookie: sessionInfo.cookieString },
        })
        .catch(() => {});

      this.destroyLocalSession(sessionId, "Explicit Logout");
    } catch (err: unknown) {
      const caughtError = err instanceof Error ? err : new Error(String(err));
      logger.error({ error: caughtError.message, msg: "Logout failed", sessionId });
      this.destroyLocalSession(sessionId, "Logout Error Recovery");
    }
  }

  // Wipes local session data and nulls references to assist garbage collection.
  destroyLocalSession(sessionId: string, reason: string = "Unknown") {
    const sessionInfo = this.sessions.get(sessionId);
    if (sessionInfo) {
      sessionInfo.cookies = null;
      sessionInfo.cookieString = null;
      this.sessions.delete(sessionId);
      logger.info({
        msg: "Service Layer session destroyed",
        reason,
        sessionId,
      });
    }
    this.sessionCredentials.delete(sessionId);
  }

  private async refreshSessionAfterUnauthorized(sessionId: string): Promise<void> {
    const existingRefresh = this.refreshLocks.get(sessionId);
    if (existingRefresh) {
      await existingRefresh;
      return;
    }

    const refreshPromise = (async () => {
      const sessionInfo = this.sessions.get(sessionId);
      const credentials = this.sessionCredentials.get(sessionId);

      if (!sessionInfo || !credentials) {
        throw new Error("Cannot refresh SAP session: missing local session or credentials");
      }

      const sapLogin = await this.loginToSap(
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

    this.refreshLocks.set(sessionId, refreshPromise);

    try {
      await refreshPromise;
    } finally {
      this.refreshLocks.delete(sessionId);
    }
  }

  // Returns the technical details of a managed session.
  getSession(sessionId: string): SLSessionInfo | null {
    return this.sessions.get(sessionId) || null;
  }

  // Verifies if the internal session tracker still contains the provided ID.
  isSessionValid(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }
}

// Global orchestration instance for all Service Layer communication.
export const serviceLayerClient = new ServiceLayerClient();
