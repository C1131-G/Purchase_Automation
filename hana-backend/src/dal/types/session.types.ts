import "express-session";

declare module "express-session" {
  interface SessionData {
    sessionId: string;
    dbName: string;
    dbServer: string;
    user: {
      userName: string;
    };
    userAgent?: string;
    lastActivity?: number;
  }

  interface Session {
    sessionId: string;
    dbName: string;
    dbServer: string;
    user: {
      userName: string;
    };
    userAgent?: string;
    lastActivity?: number;
  }
}
