export type IcSlSessionRecord = {
  sessionId: number;
  companyId: number;
  connectionId: number | null;
  sessionToken: string;
  routeId: string | null;
  loginTime: string;
  expiryTime: string;
};

export type IcSlLoginResult = {
  sessionToken: string;
  routeId: string | null;
  expiryTime: Date;
};
