export interface AuthUser {
  userName: string;
  dbName: string;
  dbServer?: string;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

export interface AuthenticatedRequest<
  _Params = Record<string, string>,
  _ResBody = unknown,
  _ReqBody = unknown,
  _Query = Record<string, unknown>,
> {
  user: AuthUser;
  session: {
    sessionId: string;
    dbName: string;
    user: AuthUser;
    userAgent?: string;
  };
}
