import "@/dal/types/session.types";
import type { Request } from "express";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        userName: string;
        dbName: string;
        dbServer: string;
        sessionId: string;
      };
    }
  }
}

export interface AuthenticatedRequest<
  P = Record<string, string>,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = unknown,
> extends Request<P, ResBody, ReqBody, ReqQuery> {
  user: NonNullable<Express.Request["user"]>;
}
