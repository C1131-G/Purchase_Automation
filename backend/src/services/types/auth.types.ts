/**
 * Auth Service Types
 */

export interface AuthSession {
  sessionId: string;
  sessionTimeout: number;
  companyDB: string;
  userName: string;
  loginTime: number;
}

export interface UserContext {
  id: string;
  code: string;
  name: string;
  type: "vendor" | "customer" | "admin";
  dbName: string;
  sessionId: string;
}
