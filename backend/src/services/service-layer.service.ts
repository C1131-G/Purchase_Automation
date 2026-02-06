// SAP Business One Service Layer Client: High-level HTTP controller for interacting with the SAP B1 REST API. Manages session persistence, automatic retries using exponential backoff, and binary file transmissions.

import https from "node:https";

import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import axiosRetry from "axios-retry";

import { logger } from "@/core/logger/pino-logger";
import { extractSessionId } from "@/core/utils/cookie-parser.utils";
import type { SLError, SLSessionInfo } from "@/services/types/service-layer.types";

class ServiceLayerClient {
  private httpsAgent: https.Agent | null = null;
  private client: AxiosInstance | null = null;
  // Maps application-internal session IDs to SAP-native cookies and metadata.
  private sessions: Map<string, SLSessionInfo> = new Map();
  // Default inactivity window before an internal session is purged (30 minutes).
  private timeoutLimit: number = 30 * 60 * 1000;

  constructor() {
    // Background worker to prevent memory leaks from abandoned sessions.
    setInterval(() => this.cleanupInactiveSessions(), 30 * 60 * 1000);
  }

  // Configures the underlying Axios client. In development, SSL verification is often disabled for self-signed SAP containers.
  initialize(serviceLayerURL: string, rejectUnauthorized: boolean = false) {
    this.httpsAgent = new https.Agent({
      rejectUnauthorized,
    });

    this.client = axios.create({
      baseURL: serviceLayerURL,
      httpsAgent: this.httpsAgent,
      timeout: 30000,
    });

    // Implements resilient communication. Retries 5xx errors which are common during high-load SAP transactions.
    axiosRetry(this.client, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        const shouldRetry =
          axiosRetry.isNetworkOrIdempotentRequestError(error) ||
          (!!error.response && error.response.status >= 500);
        return shouldRetry;
      },
      onRetry: (retryCount, error, requestConfig) => {
        logger.warn({
          msg: "Service Layer retry",
          attempt: retryCount,
          url: requestConfig.url,
          error: error.message,
        });
      },
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
    if (!this.client) throw new Error("Service Layer client not initialized");

    try {
      const response = await this.client.post("/Login", {
        CompanyDB: companyDB,
        UserName: username,
        Password: password,
      });

      // Captures the raw set-cookie headers from SAP.
      const cookies: string[] = response.headers["set-cookie"] || [];
      const sessionId = extractSessionId(cookies);

      if (!sessionId) {
        throw new Error("No session ID received from Service Layer");
      }

      // Concatenates all provided cookies into a single string for subsequent Authorization headers.
      const cookieString = cookies.map((cookie) => cookie.split(";")[0]).join("; ");

      const sessionInfo: SLSessionInfo = {
        sessionId,
        companyDB,
        username,
        loginTime: Date.now(),
        lastSapCall: Date.now(),
        cookies,
        cookieString,
      };

      this.sessions.set(sessionId, sessionInfo);

      logger.info({ msg: "Service Layer session created", sessionId, companyDB, username });

      return {
        sessionId,
        version: (response.data as Record<string, unknown>).Version as string,
        sessionTimeout: (response.data as Record<string, unknown>).SessionTimeout as number,
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
  ): Promise<T> {
    if (!this.client) throw new Error("Service Layer client not initialized");

    const sessionInfo = this.sessions.get(sessionId);

    if (!sessionInfo || !sessionInfo.cookieString) {
      const error = new Error("Invalid or expired session") as SLError;
      error.statusCode = 401;
      throw error;
    }

    // Slide the inactivity window.
    sessionInfo.lastSapCall = Date.now();

    try {
      const config: AxiosRequestConfig = {
        method,
        url: endpoint,
        headers: {
          Cookie: sessionInfo.cookieString,
          "Content-Type": "application/json",
        },
      };

      if (data) {
        config.data = data;
      }

      const response = await this.client(config);
      return response.data as T;
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const statusCode = err.response?.status;
        const message = err.response?.data?.error?.message?.value || err.message;

        logger.error({
          msg: "Service Layer request failed",
          method,
          endpoint,
          status: statusCode,
          error: message,
        });

        // If SAP explicitly rejects the session, purge the local cache to force a re-login flow on the next attempt.
        if (statusCode === 401) {
          this.destroyLocalSession(sessionId, "SAP 401 Unauthorized");
          const sessionError = new Error("SAP session expired") as SLError;
          sessionError.statusCode = 401;
          sessionError.isSessionExpired = true;
          throw sessionError;
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
    if (!this.client) return;
    const sessionInfo = this.sessions.get(sessionId);
    if (!sessionInfo) return;

    try {
      // Best-effort logout attempt. SAP might have already killed the session.
      await this.client
        .post("/Logout", null, {
          headers: { Cookie: sessionInfo.cookieString },
        })
        .catch(() => {});

      this.destroyLocalSession(sessionId, "Explicit Logout");
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error({ msg: "Logout failed", sessionId, error: error.message });
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
      logger.info({ msg: "Service Layer session destroyed", sessionId, reason });
    }
  }

  // Scans the session registry and purges items that haven't sent a request within the timeoutLimit.
  cleanupInactiveSessions() {
    const now = Date.now();
    let count = 0;

    for (const [sessionId, info] of this.sessions.entries()) {
      if (now - info.lastSapCall > this.timeoutLimit) {
        this.destroyLocalSession(sessionId, "Inactivity Checkout (30m)");
        count++;
      }
    }

    if (count > 0) {
      logger.info({ msg: "Cleanup task finished", destroyedCount: count });
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

  // Handles binary file uploads. SAP requires a specific multipart/form-data boundary and binary-string encoding.
  async uploadAttachment(
    sessionId: string,
    file: { filepath: string; originalFilename: string; mimetype: string },
  ): Promise<Record<string, unknown>> {
    if (!this.client) throw new Error("Service Layer client not initialized");

    const sessionInfo = this.sessions.get(sessionId);

    if (!sessionInfo || !sessionInfo.cookieString) {
      const error = new Error("Invalid or expired session") as SLError;
      error.statusCode = 401;
      throw error;
    }

    sessionInfo.lastSapCall = Date.now();

    try {
      const fs = await import("node:fs");
      const fileBuffer = await fs.promises.readFile(file.filepath);

      // Custom boundary generation to avoid collision with binary content.
      const boundary = `----WebKitFormBoundary${Math.random().toString(36).substring(2)}`;

      // Constructing raw multipart preamble.
      const lines = [
        `--${boundary}`,
        `Content-Disposition: form-data; name="files"; filename="${file.originalFilename}"`,
        `Content-Type: ${file.mimetype}`,
        "",
        fileBuffer.toString("binary"),
        `--${boundary}--`,
        "",
      ];

      const payloadKey = lines.join("\r\n");
      // Converts the constructed string back to a Buffer using 'binary' encoding to preserve non-UTF8 characters.
      const payloadBuffer = Buffer.from(payloadKey, "binary");

      const config: AxiosRequestConfig = {
        method: "POST",
        url: "/Attachments2",
        headers: {
          Cookie: sessionInfo.cookieString,
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": payloadBuffer.length,
        },
        data: payloadBuffer,
      };

      const response = await this.client(config);
      return response.data as Record<string, unknown>;
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const statusCode = err.response?.status;
        const message = err.response?.data?.error?.message?.value || err.message;

        logger.error({
          msg: "Attachment upload failed",
          filename: file.originalFilename,
          status: statusCode,
          error: message,
        });

        if (statusCode === 401) {
          this.destroyLocalSession(sessionId, "SAP 401 (Upload)");
          const sessionError = new Error("SAP session expired") as SLError;
          sessionError.statusCode = 401;
          sessionError.isSessionExpired = true;
          throw sessionError;
        }

        const customErr = new Error(`Failed to upload attachment: ${message}`) as SLError;
        customErr.statusCode = statusCode || 500;
        throw customErr;
      }
      throw err instanceof Error ? err : new Error(String(err));
    }
  }
}

// Global orchestration instance for all Service Layer communication.
export const serviceLayerClient = new ServiceLayerClient();
