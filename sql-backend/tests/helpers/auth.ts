import type { NextFunction, Request, Response } from "express";

/** Fixed user used by authenticated integration tests. */
export const TEST_USER = {
  dbName: "test_company",
  userName: "test.user",
};

/**
 * Express middleware that injects a fake session user (no SAP / real login).
 * Use via vi.mock of validateSession in integration tests.
 */
export function injectTestSession(req: Request, _res: Response, next: NextFunction) {
  const session = (req.session ??= {} as Express.Session);
  (session as { user?: typeof TEST_USER }).user = { ...TEST_USER };
  next();
}
