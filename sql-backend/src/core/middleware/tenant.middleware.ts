import type { NextFunction, Request, Response } from "express";
import { getDbForTenant, dbContext } from "@/db/client";

export function initTenantContext(req: Request, _res: Response, next: NextFunction) {
  const dbName = req.session?.user?.dbName;
  if (!dbName) {
    return next();
  }

  try {
    const tenantDb = getDbForTenant(dbName);
    dbContext.run({ db: tenantDb, dbName }, () => {
      next();
    });
  } catch (err) {
    next(err);
  }
}
