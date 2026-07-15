// SAP Business One Service Layer Client.

import https from "node:https";

import axios from "axios";
import type { AxiosInstance } from "axios";
import axiosRetry from "axios-retry";

import { logger } from "@/core/logger/pino-logger";
import type { SLError, SLSessionInfo } from "@/services/types/service-layer.types";

import {
  executeServiceLayerRequest,
  loginToSap,
  type ServiceLayerHost,
} from "./service-layer-request";

class ServiceLayerClient implements ServiceLayerHost {
  private httpsAgent: https.Agent | null = null;
  client: AxiosInstance | null = null;
  sessions = new Map<string, SLSessionInfo>();
  sessionCredentials = new Map<string, { companyDB: string; username: string; password: string }>();
  refreshLocks = new Map<string, Promise<void>>();

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

  async login(
    companyDB: string,
    username: string,
    password: string,
  ): Promise<{ sessionId: string; version: string; sessionTimeout: number }> {
    if (!this.client) {
      throw new Error("Service Layer client not initialized");
    }

    try {
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

      logger.info({
        msg: "Service Layer login successful",
        companyDB,
        username,
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

    try {
      await this.client
        .post("/Logout", null, {
          headers: { Cookie: sessionInfo.cookieString },
        })
        .catch(() => {});

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

  getSession(sessionId: string): SLSessionInfo | null {
    return this.sessions.get(sessionId) || null;
  }

  isSessionValid(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }
}

export const serviceLayerClient = new ServiceLayerClient();
