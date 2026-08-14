import "express-session";

declare module "express-session" {
  interface SessionData {
    sessionId: string;
    dbName: string;
    dbServer: string;
    user: {
      userName: string;
      dbName: string;
      dbServer: string;
      companyName?: string;
    };
    userAgent?: string;
    lastActivity?: number;
    /** SAP B1SESSION cookie — used to rehydrate SL after a backend restart. */
    sapCookie?: string;
    /** Service Layer username that owns sapCookie (not the portal display name). */
    slUsername?: string;
  }

  interface Session {
    sessionId: string;
    dbName: string;
    dbServer: string;
    user: {
      userName: string;
      dbName: string;
      dbServer: string;
      companyName?: string;
    };
    userAgent?: string;
    lastActivity?: number;
    sapCookie?: string;
    slUsername?: string;
  }
}
