export interface LoginResponse {
  sessionId: string;
  sessionTimeout: number;
  slUsername?: string;
  slPassword?: string;
  user: {
    userName: string;
    dbName: string;
    dbServer: string;
    companyName?: string;
  };
}
