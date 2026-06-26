// Session Validation Middleware: Gatekeeper for all protected routes. Ensures the user has a valid local Express session that is synchronized with a live SAP Service Layer session.

import type { NextFunction, Request, RequestHandler, Response } from "express";

import { logger } from "@/core/logger/pino-logger";
import { serviceLayerClient } from "@/services/service-layer.service";

// validateSession: Intercepts requests to verify authentication state.
export const validateSession: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { session } = req;

  // Basic check: Is there a signed session cookie and does it contain vendor-specific metadata?
  if (!session || !session.sessionId || !session.user) {
    if (req.path !== "/me") {
      logger.warn({
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

  // Double Check: Verifies if the SAP Service Layer session mapped to this Express session is still active in the backend memory.
  // This handles backend restarts — the Express session (cookie) survives, but the in-memory SAP session map is wiped.
  if (!serviceLayerClient.isSessionValid(session.sessionId)) {
    // Attempt silent re-login using the credentials stored in the Express session.
    const { slCompanyDB, slUsername, slPassword } = session;

    if (slCompanyDB && slUsername && slPassword) {
      try {
        logger.info({
          event: "sap_session_auto_reconnect",
          reason: "in_memory_session_lost",
          username: session.user.userName,
        });

        const newSession = await serviceLayerClient.login(slCompanyDB, slUsername, slPassword);

        // Update the Express session with the new SAP session ID
        session.sessionId = newSession.sessionId;
        await new Promise<void>((resolve, reject) =>
          session.save((err) => (err ? reject(err) : resolve())),
        );

        logger.info({
          event: "sap_session_reconnected",
          username: session.user.userName,
        });
      } catch (reconnectErr: unknown) {
        const errMsg = reconnectErr instanceof Error ? reconnectErr.message : String(reconnectErr);
        logger.warn({
          event: "sap_session_reconnect_failed",
          error: errMsg,
          username: session.user.userName,
        });

        // Re-login failed — destroy the session and force the user to login again.
        session.destroy(() => {});
        res.clearCookie("vendorportal.sid");

        return res.status(401).json({
          message: "Session has expired. Please login again.",
          success: false,
        });
      }
    } else {
      // No stored credentials — can't reconnect. Force re-login.
      logger.warn({
        event: "session_expired_in_sap",
        reason: "no_stored_sl_credentials",
        username: session.user.userName,
      });

      session.destroy(() => {});
      res.clearCookie("vendorportal.sid");

      return res.status(401).json({
        message: "Session has expired",
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

  next();
};
