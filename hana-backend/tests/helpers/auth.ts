import type { NextFunction, Request, Response } from "express";

export const TEST_SESSION = {
  sessionId: "test-sl-session",
  dbName: "TEST_COMPANY",
  user: {
    dbName: "TEST_COMPANY",
    userName: "test.user",
  },
  slCompanyDB: "TEST_COMPANY",
  slUsername: "manager",
  slPassword: "secret",
};

/**
 * Middleware that injects a full HANA/SAP-shaped session without login.
 * Pair with a mocked serviceLayerClient.isSessionValid === true.
 */
export function injectTestSession(req: Request, _res: Response, next: NextFunction) {
  const session = (req.session ??= {} as Express.Session);
  Object.assign(session, TEST_SESSION);
  next();
}
