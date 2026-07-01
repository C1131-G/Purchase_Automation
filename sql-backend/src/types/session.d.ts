import "express-session";

declare module "express-session" {
  interface SessionData {
    user: {
      userName: string;
      companyName?: string;
    };
    lastActivity?: number;
  }
}
