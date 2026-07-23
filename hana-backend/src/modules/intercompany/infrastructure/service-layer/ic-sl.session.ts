import type { IcSapConnection } from "@/modules/intercompany/config/sap-connection/sap-connection.types";
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

/**
 * Session manager: reuse valid IC_SL_SESSION or login via injected loginFn.
 * Document create helpers remain stubs until P5/P6.
 */
export const createIcSlSessionService = (deps?: {
  store?: IcSlSessionStore;
  loginFn?: IcSlLoginFn;
  sessionTtlMinutes?: number;
}) => {
  const store = deps?.store ?? createSqlSessionStore();
  const ttl = deps?.sessionTtlMinutes ?? 30;

  const defaultLogin: IcSlLoginFn = async () => {
    throw new Error("Not implemented: IC Service Layer login (wire axios in P5)");
  };
  const loginFn = deps?.loginFn ?? defaultLogin;

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

export const icSlSessionService = createIcSlSessionService();
