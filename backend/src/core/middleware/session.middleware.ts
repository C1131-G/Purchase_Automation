// Session Validation Middleware: Gatekeeper for all protected routes. Ensures the user has a valid local Express session that is synchronized with a live SAP Service Layer session.

import type { NextFunction, Request, RequestHandler, Response } from "express";

import { logger } from "@/core/logger/pino-logger";
import { serviceLayerClient } from "@/services/service-layer.service";

// validateSession: Intercepts requests to verify authentication state.
export const validateSession: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const session = req.session;

  // Basic check: Is there a signed session cookie and does it contain vendor-specific metadata?
  if (!session || !session.sessionId || !session.user) {
    if (req.path !== "/me") {
      logger.warn({
        event: "session_validation_failed",
        reason: "no_session_or_user",
        path: req.path,
      });
    }

    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  // Double Check: Verifies if the SAP Service Layer session mapped to this Express session is still active in the backend memory.
  // This is critical because SAP might have cleared the session due to a server restart or internal policy even if the client's cookie is valid.
  if (!serviceLayerClient.isSessionValid(session.sessionId)) {
    logger.warn({
      event: "session_expired_in_sap",
      username: session.user.userName,
      reason: "sap_session_cleaned_up_or_expired",
    });

    // Cleanup local state to force the user to re-authenticate.
    session.destroy(() => {});
    res.clearCookie("vendorportal.sid");

    return res.status(401).json({
      success: false,
      message: "Session has expired",
    });
  }

  // Hydrate the Request object with user metadata for downstream business logic (permission checks, tenant identification).
  req.user = {
    ...session.user,
    dbName: session.dbName,
    dbServer: session.dbServer,
  };

  next();
};
