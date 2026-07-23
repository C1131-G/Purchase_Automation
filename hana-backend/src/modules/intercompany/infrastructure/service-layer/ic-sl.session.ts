import https from "node:https";

import axios from "axios";

import type { IcSapConnection } from "@/modules/intercompany/config/sap-connection/sap-connection.types";
import { extractSessionId } from "@/core/utils/cookie-parser";
import {
  getIcSqlClient,
  toNullableNumber,
  toNumber,
  toString,
  type IcSqlClient,
} from "@/modules/intercompany/infrastructure/ic-sql";

import type { IcSlLoginResult, IcSlSessionRecord } from "./ic-sl.types";

export type IcSlSessionStore = {
  findValid: (companyId: number) => Promise<IcSlSessionRecord | null>;
  save: (input: {
    companyId: number;
    connectionId: number | null;
    sessionToken: string;
    routeId: string | null;
    loginTime: Date;
    expiryTime: Date;
  }) => Promise<IcSlSessionRecord>;
  invalidate: (companyId: number) => Promise<void>;
};

const mapSession = (row: Record<string, unknown>): IcSlSessionRecord => ({
  companyId: toNumber(row.COMPANY_ID ?? row.companyId),
  connectionId: toNullableNumber(row.CONNECTION_ID ?? row.connectionId),
  expiryTime: toString(row.EXPIRY_TIME ?? row.expiryTime),
  loginTime: toString(row.LOGIN_TIME ?? row.loginTime),
  routeId: row.ROUTE_ID === null || row.ROUTE_ID === undefined ? null : toString(row.ROUTE_ID),
  sessionId: toNumber(row.SESSION_ID ?? row.sessionId),
  sessionToken: toString(row.SESSION_TOKEN ?? row.sessionToken),
});

export const createSqlSessionStore = (sql: IcSqlClient = getIcSqlClient()): IcSlSessionStore => ({
  findValid: async (companyId) => {
    const rows = await sql.query(
      `SELECT * FROM "IC_SL_SESSION"
        WHERE "COMPANY_ID" = ?
          AND "EXPIRY_TIME" > CURRENT_TIMESTAMP
        ORDER BY "SESSION_ID" DESC`,
      [companyId],
    );
    return rows[0] ? mapSession(rows[0]) : null;
  },

  invalidate: async (companyId) => {
    await sql.query(
      `UPDATE "IC_SL_SESSION"
          SET "EXPIRY_TIME" = CURRENT_TIMESTAMP
        WHERE "COMPANY_ID" = ? AND "EXPIRY_TIME" > CURRENT_TIMESTAMP`,
      [companyId],
    );
  },

  save: async (input) => {
    await sql.query(
      `INSERT INTO "IC_SL_SESSION"
        ("COMPANY_ID","CONNECTION_ID","SESSION_TOKEN","ROUTE_ID","LOGIN_TIME","EXPIRY_TIME")
       VALUES (?,?,?,?,?,?)`,
      [
        input.companyId,
        input.connectionId,
        input.sessionToken,
        input.routeId,
        input.loginTime.toISOString(),
        input.expiryTime.toISOString(),
      ],
    );
    const idRows = await sql.query(`SELECT CURRENT_IDENTITY_VALUE() AS "ID" FROM DUMMY`);
    const sessionId = toNumber(idRows[0]?.ID ?? idRows[0]?.id);
    return {
      companyId: input.companyId,
      connectionId: input.connectionId,
      expiryTime: input.expiryTime.toISOString(),
      loginTime: input.loginTime.toISOString(),
      routeId: input.routeId,
      sessionId,
      sessionToken: input.sessionToken,
    };
  },
});

export type IcSlLoginFn = (connection: IcSapConnection) => Promise<IcSlLoginResult>;

const extractRouteId = (cookies: string[]): string | null => {
  for (const cookie of cookies) {
    const match = cookie.match(/ROUTEID=([^;]+)/i);
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
};

/** Default SL login against connection.serviceLayerUrl (no shared portal session). */
export const defaultIcSlLogin: IcSlLoginFn = async (connection) => {
  const baseURL = connection.serviceLayerUrl.replace(/\/+$/, "");
  const response = await axios.post(
    `${baseURL}/Login`,
    {
      CompanyDB: connection.databaseName,
      Password: connection.password,
      UserName: connection.username,
    },
    {
      headers: { "Content-Type": "application/json" },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      timeout: 30_000,
      validateStatus: () => true,
    },
  );

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
        ? `IC SL login failed (${response.status}): ${sapMessage}`
        : `IC SL login failed with status ${response.status}`,
    );
  }

  const cookies: string[] = response.headers["set-cookie"] || [];
  const sessionToken = extractSessionId(cookies);
  if (!sessionToken) {
    throw new Error("IC SL login: no B1SESSION cookie received");
  }

  const timeoutMinutes = Number(
    (response.data as { SessionTimeout?: number })?.SessionTimeout ?? 30,
  );
  const ttlMinutes = Number.isFinite(timeoutMinutes) && timeoutMinutes > 0 ? timeoutMinutes : 30;
  const now = new Date();

  return {
    expiryTime: new Date(now.getTime() + ttlMinutes * 60_000),
    routeId: extractRouteId(cookies),
    sessionToken,
  };
};

/**
 * Session manager: reuse valid IC_SL_SESSION or login via injected/default loginFn.
 */
export const createIcSlSessionService = (deps?: {
  store?: IcSlSessionStore;
  loginFn?: IcSlLoginFn;
  sessionTtlMinutes?: number;
}) => {
  const store = deps?.store ?? createSqlSessionStore();
  const ttl = deps?.sessionTtlMinutes ?? 30;
  const loginFn = deps?.loginFn ?? defaultIcSlLogin;

  return {
    getOrLogin: async (connection: IcSapConnection): Promise<IcSlSessionRecord> => {
      const existing = await store.findValid(connection.companyId);
      if (existing) {
        return existing;
      }
      const login = await loginFn(connection);
      const now = new Date();
      const expiry = login.expiryTime ?? new Date(now.getTime() + ttl * 60_000);
      return store.save({
        companyId: connection.companyId,
        connectionId: connection.connectionId,
        expiryTime: expiry,
        loginTime: now,
        routeId: login.routeId,
        sessionToken: login.sessionToken,
      });
    },

    invalidate: (companyId: number) => store.invalidate(companyId),
  };
};

export type IcSlSessionService = ReturnType<typeof createIcSlSessionService>;

export const icSlSessionService = createIcSlSessionService();
