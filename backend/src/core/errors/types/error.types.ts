import type { Request } from "express";

import { logger } from "@/core/logger/pino-logger";

export interface CustomSession {
  user?: { id: string };
  destroy: (callback: () => void) => void;
}

export type RequestWithSession = Request & {
  session?: CustomSession;
  log?: typeof logger;
};
