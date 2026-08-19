// Authentication Service: Manages security flows including multi-tenant login, session validation, and logout.

import { Raw } from "typeorm";

// Core & Utils
import { logger } from "@/core/logger/pino-logger";
import { recordAuthLogin } from "@/core/observability/metrics";
import { getCachedData } from "@/core/utils/cache";
// Data Access & Schemas
import { getTenantRepository } from "@/db/tenant-query";
import type { LoginResponse } from "./auth.types";
import { verifyPortalPassword } from "./portal-password";
import { UserSchema } from "@/db/schemas/user.schema";
import { getServiceLayerCredentials } from "@/services/credential.service";
import { serviceLayerClient } from "@/services/service-layer.service";
import type { SLError } from "@/services/types/service-layer.types";

interface ExtendedSLError extends SLError {
  reason?: string;
}

// Orchestrates the login process: fetches credentials, verifies local portal passwords, and establishes a Service Layer session.
export const login = async (
  username: string,
  password: string,
  dbName: string,
  onPortalAuthenticated?: () => void,
): Promise<LoginResponse> => {
  const loginStartedAt = process.hrtime.bigint();
  try {
    // Stage 1: Parallel retrieval of Service Layer technical credentials and local user profile from the tenant DB.
    const stage1StartedAt = process.hrtime.bigint();
    const [dbInfo, localUser] = await Promise.all([
      getServiceLayerCredentials(dbName),
      (async () => {
        // Cache user profiles for 5 minutes since they change infrequently but are checked on every login.
        const cacheKey = `user:${dbName}:${username.toUpperCase()}`;
        return getCachedData(
          cacheKey,
          async () => {
            const repo = await getTenantRepository(dbName, UserSchema);
            // Identity + portal credential + display name only (minimal OUSR projection).
            return await repo.findOne({
              select: ["USER_CODE", "U_PortalPassword", "U_NAME"],
              where: {
                USER_CODE: Raw((alias) => `UPPER(${alias}) = UPPER(:username)`, { username }),
              },
            });
          },
          1000 * 60 * 5,
        );
      })(),
    ]);
    const portalAuthMs = Math.round(Number(process.hrtime.bigint() - stage1StartedAt) / 1e6);

    // Validate database configuration existence.
    if (!dbInfo) {
      throw new Error(`Database ${dbName} not found`);
    }

    // Verify the portal-specific account.
    if (!localUser) {
      const error = new Error("Invalid username or password") as ExtendedSLError;
      error.statusCode = 401;
      error.reason = "user_not_found";
      throw error;
    }

    // Match USER_CODE (SQL) and U_PortalPassword. Stored value may be a bcrypt
    // hash (cost 10) or leftover plaintext — verifyPortalPassword handles both.
    if (localUser.U_PortalPassword) {
      const passwordMatches = await verifyPortalPassword(localUser.U_PortalPassword, password);
      if (!passwordMatches) {
        const error = new Error("Invalid username or password") as ExtendedSLError;
        error.statusCode = 401;
        error.reason = "password_mismatch";
        throw error;
      }
    } else {
      // Security Guard: If the user explicitly stated the column is there but we can't find it or it's null,
      // we log a warning. In a strictly managed environment, we might even block login here.
      logger.warn({
        msg: "U_PortalPassword missing or null for user, falling back to Service Layer verification",
        username,
      });
    }

    // Dashboard HANA queries do not depend on the Service Layer session. Start
    // their warm-up now so it overlaps the usually slower SAP login below.
    onPortalAuthenticated?.();

    // Stage 2: Service Layer login (reuses live session for same service account when possible).
    const slStartedAt = process.hrtime.bigint();
    const sessionInfo = await serviceLayerClient.login(
      dbName,
      dbInfo.serviceLayerUsername || username,
      dbInfo.serviceLayerPassword || password,
    );
    const serviceLayerMs = Math.round(Number(process.hrtime.bigint() - slStartedAt) / 1e6);
    const totalMs = Math.round(Number(process.hrtime.bigint() - loginStartedAt) / 1e6);

    logger.info({
      company: dbName,
      msg: "User login success",
      username,
      portalAuthMs,
      serviceLayerMs,
      totalMs,
    });
    recordAuthLogin("success");

    // Map internal SAP data to a unified user session object for the frontend.
    // companyName comes from already-fetched credentials — no extra org DB round-trip.
    return {
      sessionId: sessionInfo.sessionId,
      sessionTimeout: sessionInfo.sessionTimeout,
      user: {
        companyName: dbInfo.companyName || dbName,
        dbName,
        dbServer: dbInfo.dbServer,
        userName: localUser.U_NAME || username,
      },
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    const sapError = caughtError as ExtendedSLError;
    recordAuthLogin("fail");
    logger.error({
      company: dbName,
      err: caughtError,
      msg: "User login failed",
      reason: sapError.reason || "service_layer_error",
      status: sapError.statusCode || 500,
      totalMs: Math.round(Number(process.hrtime.bigint() - loginStartedAt) / 1e6),
      username,
    });

    throw caughtError;
  }
};

// Verifies session health by making a lightweight head request to the Service Layer.
export const validateSession = async (sessionId: string): Promise<boolean> => {
  try {
    // Authenticated GET request to the root Service Layer endpoint returns 200 if session is valid.
    await serviceLayerClient.request(sessionId, "GET", "/");
    return true;
  } catch {
    // Any error (401, timeout, connection reset) indicates an invalid/expired session.
    return false;
  }
};

// Terminates the session in SAP Service Layer and clears internal session tracking.
export const logout = async (sessionId: string): Promise<void> => {
  try {
    await serviceLayerClient.logout(sessionId);
    logger.info({
      msg: "User logged out from SAP Service Layer",
      sessionId: `${sessionId.slice(0, 10)}...`,
    });
  } catch (err: unknown) {
    // Logging as warning since the session might have already timed out on the server side.
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.warn({
      err: caughtError,
      msg: "SAP logout failed (session may have expired)",
    });
  }
};

// Quick lookup for session metadata (mapping sessionId to companyDB and login time).
export const getSessionInfo = (sessionId: string) => serviceLayerClient.getSession(sessionId);

export const authService = {
  getSessionInfo,
  login,
  logout,
  validateSession,
};
