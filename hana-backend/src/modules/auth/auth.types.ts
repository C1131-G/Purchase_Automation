export interface LoginResponse {
  portalUsername: string;
  sessionId: string;
  sessionTimeout: number;
  user: {
    userName: string;
    dbName: string;
    dbServer: string;
    companyName?: string;
  };
}
