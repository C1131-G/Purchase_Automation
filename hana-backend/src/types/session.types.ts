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
    // SAP SL credentials stored to allow silent re-login after server restart
    slCompanyDB?: string;
    slUsername?: string;
    slPassword?: string;
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
    slCompanyDB?: string;
    slUsername?: string;
    slPassword?: string;
  }
}
