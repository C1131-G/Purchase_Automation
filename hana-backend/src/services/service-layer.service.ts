// SAP Business One Service Layer Client.

import https from "node:https";

import axios from "axios";
import type { AxiosInstance } from "axios";
import axiosRetry from "axios-retry";

import { logger } from "@/core/logger/pino-logger";
import { getServiceLayerCredentials } from "@/services/credential.service";
import type { SLError, SLSessionInfo } from "@/services/types/service-layer.types";

import {
  executeServiceLayerRequest,
  loginToSap,
  serviceLayerAbsoluteUrl,
  type ServiceLayerHost,
  type ServiceLayerSessionCredentials,
} from "./service-layer-request";

type LoginResult = { sessionId: string; version: string; sessionTimeout: number };

/** Build a stable key for credential-based session reuse (company + SL user). */
export function serviceLayerCredentialKey(companyDB: string, username: string): string {
  return `${companyDB.trim().toUpperCase()}::${username.trim().toUpperCase()}`;
}

class ServiceLayerClient implements ServiceLayerHost {
  private httpsAgent: https.Agent | null = null;
  client: AxiosInstance | null = null;
  sessions = new Map<string, SLSessionInfo>();
  sessionCredentials = new Map<string, ServiceLayerSessionCredentials>();
  refreshLocks = new Map<string, Promise<void>>();

  /**
   * Index of live SL sessions by credential key so the same service account
   * (or user) reuses one SAP session instead of calling /Login every time.
   */
  private credentialSessionIndex = new Map<string, string>();
  /** How many portal Express sessions currently reference each SL session. */
  private sessionRefCounts = new Map<string, number>();
  /** In-flight login promises keyed by credential — collapses concurrent logins. */
  private loginInFlight = new Map<string, Promise<LoginResult>>();

  initialize(serviceLayerURL: string, rejectUnauthorized: boolean = false) {
    this.httpsAgent = new https.Agent({
      rejectUnauthorized,
    });

    this.client = axios.create({
      baseURL: serviceLayerURL,
      httpsAgent: this.httpsAgent,
      timeout: 30_000,
    });

    axiosRetry(this.client, {
      onRetry: (retryCount, error, requestConfig) => {
        logger.warn({
          msg: "Service Layer retry",
          attempt: retryCount,
          url: requestConfig.url,
          err: error,
        });
      },
      retries: 2,
      retryCondition: (error) => {
        return (
          axiosRetry.isNetworkOrIdempotentRequestError(error) ||
          (!!error.response && error.response.status >= 500)
        );
      },
      retryDelay: axiosRetry.exponentialDelay,
    });

    logger.info({
      msg: "Service Layer initialized",
      service_Layer_URL: serviceLayerURL,
      ssl_verify: rejectUnauthorized,
    });
  }

  async login(companyDB: string, username: string, password: string): Promise<LoginResult> {
    if (!this.client) {
      throw new Error("Service Layer client not initialized");
    }

    const credKey = serviceLayerCredentialKey(companyDB, username);

    const inFlight = this.loginInFlight.get(credKey);
    if (inFlight) {
      const shared = await inFlight;
      this.retainSession(shared.sessionId);
      logger.info({
        msg: "Service Layer login joined in-flight request",
        companyDB,
        username,
      });
      return shared;
    }

    const loginPromise = this.loginWithReuse(companyDB, username, password, credKey);
    this.loginInFlight.set(credKey, loginPromise);

    try {
      return await loginPromise;
    } finally {
      this.loginInFlight.delete(credKey);
    }
  }

  private async loginWithReuse(
    companyDB: string,
    username: string,
    password: string,
    credKey: string,
  ): Promise<LoginResult> {
    try {
      const reused = this.tryReuseSession(credKey, companyDB, username, password);
      if (reused) {
        return reused;
      }

      const sapLogin = await loginToSap(this, companyDB, username, password);

      const sessionInfo: SLSessionInfo = {
        sessionId: sapLogin.sapSessionId,
        companyDB,
        username,
        cookieString: sapLogin.cookieString,
        cookies: sapLogin.cookies,
        lastSapCall: Date.now(),
        loginTime: Date.now(),
      };

      this.sessions.set(sapLogin.sapSessionId, sessionInfo);
      this.sessionCredentials.set(sapLogin.sapSessionId, {
        companyDB,
        username,
        password,
      });
      this.credentialSessionIndex.set(credKey, sapLogin.sapSessionId);
      this.sessionRefCounts.set(sapLogin.sapSessionId, 1);

      logger.info({
        msg: "Service Layer login successful",
        companyDB,
        username,
        reused: false,
      });

      return {
        sessionId: sapLogin.sapSessionId,
        sessionTimeout: sapLogin.sessionTimeout,
        version: sapLogin.version,
      };
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.error?.message?.value || err.message;
        const customErr = new Error(message) as SLError;
        customErr.statusCode = err.response?.status || 500;
        throw customErr;
      }
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  /**
   * Reuse a still-tracked SL session for the same company + username when the
   * stored password matches (service accounts / repeated portal logins).
   */
  private tryReuseSession(
    credKey: string,
    companyDB: string,
    username: string,
    password: string,
  ): LoginResult | null {
    const existingId = this.credentialSessionIndex.get(credKey);
    if (!existingId) {
      return null;
    }

    const sessionInfo = this.sessions.get(existingId);
    const credentials = this.sessionCredentials.get(existingId);
    if (!sessionInfo || !credentials) {
      this.credentialSessionIndex.delete(credKey);
      return null;
    }

    if (credentials.password !== password) {
      // Password rotated for this technical user — force a fresh SAP login.
      this.credentialSessionIndex.delete(credKey);
      return null;
    }

    this.retainSession(existingId);
    sessionInfo.lastSapCall = Date.now();

    logger.info({
      msg: "Service Layer session reused (skipped /Login)",
      companyDB,
      username,
      sessionId: `${existingId.slice(0, 10)}...`,
    });

    return {
      sessionId: existingId,
      // SAP only returns SessionTimeout on Login; default to 30 minutes when reusing.
      sessionTimeout: 30,
      version: "",
    };
  }

  private retainSession(sessionId: string): void {
    const current = this.sessionRefCounts.get(sessionId) ?? 0;
    this.sessionRefCounts.set(sessionId, current + 1);
  }

  async request<T>(
    sessionId: string,
    method: string,
    endpoint: string,
    data: unknown = null,
    allowUnauthorizedRetry: boolean = true,
    customHeaders?: Record<string, string>,
  ): Promise<T> {
    return executeServiceLayerRequest<T>(
      this,
      sessionId,
      method,
      endpoint,
      data,
      allowUnauthorizedRetry,
      customHeaders,
    );
  }

  async logout(sessionId: string): Promise<void> {
    if (!this.client) {
      return;
    }
    const sessionInfo = this.sessions.get(sessionId);
    if (!sessionInfo) {
      return;
    }

    // Shared service-account sessions: only tear down SAP when the last portal user leaves.
    const refs = this.sessionRefCounts.get(sessionId) ?? 1;
    if (refs > 1) {
      this.sessionRefCounts.set(sessionId, refs - 1);
      logger.info({
        msg: "Service Layer session retained (other portal sessions still using it)",
        remainingRefs: refs - 1,
        sessionId: `${sessionId.slice(0, 10)}...`,
      });
      return;
    }

    const logoutPath = "/Logout";
    const absoluteUrl = serviceLayerAbsoluteUrl(this.client.defaults.baseURL, logoutPath);
    const start = process.hrtime.bigint();

    try {
      const response = await this.client
        .post(logoutPath, null, {
          headers: { Cookie: sessionInfo.cookieString },
        })
        .catch(() => null);

      const durationMs = Math.round(Number(process.hrtime.bigint() - start) / 1e6);
      logger.info(
        {
          direction: "outbound",
          target: "service_layer",
          method: "POST",
          url: absoluteUrl,
          path: logoutPath,
          status: response?.status ?? 0,
          durationMs,
          endpointGroup: "Logout",
        },
        `SL POST ${logoutPath} ${response?.status ?? "error"}`,
      );

      this.destroyLocalSession(sessionId, "Explicit Logout");
    } catch (err: unknown) {
      const caughtError = err instanceof Error ? err : new Error(String(err));
      logger.error({ err: caughtError, msg: "Logout failed", sessionId });
      this.destroyLocalSession(sessionId, "Logout Error Recovery");
    }
  }

  destroyLocalSession(sessionId: string, reason: string = "Unknown") {
    const sessionInfo = this.sessions.get(sessionId);
    if (sessionInfo) {
      const credKey = serviceLayerCredentialKey(sessionInfo.companyDB, sessionInfo.username);
      if (this.credentialSessionIndex.get(credKey) === sessionId) {
        this.credentialSessionIndex.delete(credKey);
      }
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
    this.sessionRefCounts.delete(sessionId);
  }

  getSession(sessionId: string): SLSessionInfo | null {
    return this.sessions.get(sessionId) || null;
  }

  isSessionValid(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  /**
   * Load company Service Layer credentials when the in-memory password is gone
   * (typical after a backend restart that only rehydrated the B1SESSION cookie).
   */
  async resolveRefreshCredentials(
    sessionId: string,
  ): Promise<ServiceLayerSessionCredentials | null> {
    const existing = this.sessionCredentials.get(sessionId);
    if (existing?.password) {
      return existing;
    }

    const sessionInfo = this.sessions.get(sessionId);
    const companyDB = sessionInfo?.companyDB?.trim() ?? "";
    if (!companyDB) {
      return null;
    }

    const dbInfo = await getServiceLayerCredentials(companyDB);
    const username = (dbInfo?.serviceLayerUsername || sessionInfo?.username || "").trim();
    const password = dbInfo?.serviceLayerPassword?.trim() ?? "";
    if (!username || !password) {
      return null;
    }

    const credentials: ServiceLayerSessionCredentials = {
      companyDB,
      password,
      username,
    };
    this.sessionCredentials.set(sessionId, credentials);
    return credentials;
  }

  async ensureSessionCredentials(sessionId: string): Promise<void> {
    if (this.sessionCredentials.get(sessionId)?.password) {
      return;
    }
    await this.resolveRefreshCredentials(sessionId);
  }

  /**
   * Restore an in-memory SL session after a process restart.
   * Uses the B1SESSION cookie saved on the Express session. Company SL
   * credentials are loaded separately so an expired cookie can silent-login.
   */
  rehydrateFromPortalSession(params: {
    sessionId: string;
    companyDB: string;
    username: string;
    cookieString: string;
  }): boolean {
    const sessionId = params.sessionId.trim();
    const cookieString = params.cookieString.trim();
    const companyDB = params.companyDB.trim();
    const username = params.username.trim();
    if (!sessionId || !cookieString || !companyDB || !username) {
      return false;
    }
    if (this.sessions.has(sessionId)) {
      return true;
    }

    const now = Date.now();
    this.sessions.set(sessionId, {
      companyDB,
      cookieString,
      cookies: [cookieString],
      lastSapCall: now,
      loginTime: now,
      sessionId,
      username,
    });
    this.retainSession(sessionId);
    const credKey = serviceLayerCredentialKey(companyDB, username);
    if (!this.credentialSessionIndex.has(credKey)) {
      this.credentialSessionIndex.set(credKey, sessionId);
    }
    logger.info({
      event: "service_layer_session_rehydrated",
      companyDB,
      sessionId: `${sessionId.slice(0, 10)}...`,
    });
    return true;
  }
}

export const serviceLayerClient = new ServiceLayerClient();
