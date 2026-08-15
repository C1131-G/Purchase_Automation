/**
 * Thin IC logging helpers on top of app pino logger.
 * Always sets `scope`; optional `check` / `outcome` for gate diagnostics.
 * Never pass passwords or session tokens in `fields` (pino also redacts common keys).
 */

import { logger } from "@/core/logger/pino-logger";

export type IcLogOutcome = "pass" | "skip" | "fail";

export type IcLogFields = Record<string, unknown> & {
  check?: string;
  corrId?: string;
  outcome?: IcLogOutcome;
};

const withScope = (scope: string, fields?: IcLogFields) => ({
  ...fields,
  scope,
});

export const icLog = {
  debug: (scope: string, msg: string, fields?: IcLogFields): void => {
    logger.debug(withScope(scope, fields), msg);
  },
  error: (scope: string, msg: string, fields?: IcLogFields): void => {
    logger.error(withScope(scope, fields), msg);
  },
  info: (scope: string, msg: string, fields?: IcLogFields): void => {
    logger.info(withScope(scope, fields), msg);
  },
  warn: (scope: string, msg: string, fields?: IcLogFields): void => {
    logger.warn(withScope(scope, fields), msg);
  },
};

/** Stable scopes used across IC module. */
export const IC_LOG_SCOPE = {
  /** Portal update → partner DRAFT RFQ / A/R draft. Not Flow 1/2 create. */
  EDIT: "ic.edit",
  FLOW1: "ic.flow1",
  FLOW1_CONVERT: "ic.flow1.convert",
  FLOW2: "ic.flow2",
  ROUTING: "ic.routing",
  SL: "ic.sl",
  TAX: "ic.tax",
} as const;
