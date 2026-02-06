export interface SLSessionInfo {
  sessionId: string;
  companyDB: string;
  username: string;
  loginTime: number;
  lastSapCall: number;
  cookies: string[] | null;
  cookieString: string | null;
}

export interface SLError extends Error {
  statusCode?: number;
  errorCode?: string | number;
  isSessionExpired?: boolean;
}
