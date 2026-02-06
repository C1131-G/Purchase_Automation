export interface LoginResponse {
  sessionId: string;
  sessionTimeout: number;
  user: {
    userName: string;
    dbName: string;
    dbServer: string;
  };
}
