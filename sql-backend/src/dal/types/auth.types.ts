export interface LoginResponse {
  sessionId: string;
  sessionTimeout: number;
  user: {
    userName: string;
    dbName: string;
  };
}

export interface CurrentUser {
  userName: string;
  dbName: string;
}
