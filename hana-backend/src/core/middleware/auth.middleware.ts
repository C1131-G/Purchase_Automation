// Session Validation Middleware: Gatekeeper for all protected routes. Ensures the user has a valid local Express session that is synchronized with a live SAP Service Layer session.

import type { NextFunction, Request, RequestHandler, Response } from "express";

import { bindRequestLogger, logger } from "@/core/logger/pino-logger";
import { serviceLayerClient } from "@/services/service-layer.service";

// validateSession: Intercepts requests to verify authentication state.
export const validateSession: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { session } = req;

  // Basic check: Is there a signed session cookie and does it contain vendor-specific metadata?
  const log = req.log || logger;

  if (!session || !session.sessionId || !session.user) {
    if (req.path !== "/me") {
      log.warn({
        event: "session_validation_failed",
        path: req.path,
        reason: "no_session_or_user",
      });
    }

    return res.status(401).json({
      message: "Authentication required",
      success: false,
    });
  }

  // Bind authenticated user onto the request logger for the rest of the chain (req.log + ALS).
  if (req.log) {
    req.log = req.log.child({
      dbName: session.dbName || session.user.dbName,
      userId: session.user.userName,
    });
    bindRequestLogger(req.log);
  }
  const authedLog = req.log || log;

  // After a backend restart the Express session can still be on disk while the
  // in-memory SAP map is empty. Reattach the saved B1SESSION cookie — do not
  // log in again with a stored password.
  if (!serviceLayerClient.isSessionValid(session.sessionId)) {
    const sapCookie = session.sapCookie?.trim() ?? "";
    const slUsername = (session.slUsername || session.user.userName || "").trim();
    const companyDB = (session.dbName || session.user.dbName || "").trim();
    const restored =
      Boolean(sapCookie) &&
      Boolean(companyDB) &&
      serviceLayerClient.rehydrateFromPortalSession({
        companyDB,
        cookieString: sapCookie,
        sessionId: session.sessionId,
        username: slUsername,
      });

    if (!restored) {
      authedLog.warn({
        event: "session_expired_in_sap",
        reason: "service_layer_session_missing",
        username: session.user.userName,
      });

      session.destroy(() => {});
      res.clearCookie("vendorportal.sid");

      return res.status(401).json({
        message: "Session has expired. Please login again.",
        success: false,
      });
    }
  }

  // Hydrate the Request object with user metadata for downstream business logic (permission checks, tenant identification).
  req.user = {
    ...session.user,
    dbName: session.dbName,
    dbServer: session.dbServer,
    sessionId: session.sessionId,
  };

  if (!session.sapCookie) {
    const live = serviceLayerClient.getSession(session.sessionId);
    if (live?.cookieString) {
      session.sapCookie = live.cookieString;
      session.slUsername = live.username;
    }
  }

  next();
};
