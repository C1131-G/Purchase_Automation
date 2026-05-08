import "@/dal/types/express.types";
import type { AuthUser } from "./express.types";

declare module "express-session" {
  interface SessionData {
    sessionId: string;
    dbName: string;
    user: AuthUser;
    userAgent?: string;
  }
}
