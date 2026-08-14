import AppError from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import type { CompanyService } from "@/modules/intercompany/config/company/company.service";
import { createCompanyService } from "@/modules/intercompany/config/company/company.service";
import type { ConfigurationService } from "@/modules/intercompany/config/configuration/configuration.service";
import { createConfigurationService } from "@/modules/intercompany/config/configuration/configuration.service";
import type { RfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import { createRfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import { IC_RFQ_STATUS } from "@/modules/intercompany/infrastructure/constants";

export const SAP_BASE_TYPE_PURCHASE_QUOTATION = 540000006;

export const PQ_RFQ_COPY_BLOCKED_MESSAGE =
  "Copy from this purchase quotation is not allowed until the RFQ is submitted.";

export type PqCopyEligibility = {
  allowed: boolean;
  reason: "flow1_disabled" | "not_ic_company" | "rfq_not_submitted" | "rfq_submitted";
  rfqStatus: string | null;
};

const isSubmittedRfqStatus = (status: string | null | undefined): boolean =>
  status === IC_RFQ_STATUS.SUBMITTED || status === IC_RFQ_STATUS.COMPLETED;

export const collectPqBaseEntries = (lines: unknown[]): number[] => {
  const entries = new Set<number>();
  for (const line of lines) {
    if (!line || typeof line !== "object") {
      continue;
    }
    const record = line as Record<string, unknown>;
    if (Number(record.BaseType) !== SAP_BASE_TYPE_PURCHASE_QUOTATION) {
      continue;
    }
    const entry = Number(record.BaseEntry);
    if (Number.isFinite(entry) && entry > 0) {
      entries.add(Math.trunc(entry));
    }
  }
  return [...entries];
};

export const createPqCopyEligibility = (deps?: {
  company?: CompanyService;
  configuration?: ConfigurationService;
  rfq?: RfqService;
}) => {
  const company = deps?.company ?? createCompanyService();
  const configuration = deps?.configuration ?? createConfigurationService();
  const rfq = deps?.rfq ?? createRfqService();

  const getEligibility = async (dbName: string, pqDocEntry: number): Promise<PqCopyEligibility> => {
    const flow1On = await configuration.isFlow1Enabled();
    if (!flow1On) {
      return { allowed: true, reason: "flow1_disabled", rfqStatus: null };
    }

    const icCompany = await company.getBySapDbName(dbName.trim());
    if (!icCompany) {
      return { allowed: true, reason: "not_ic_company", rfqStatus: null };
    }

    const existingRfq = await rfq.findBySourceDraft(icCompany.companyId, pqDocEntry);
    const rfqStatus = existingRfq?.status ? String(existingRfq.status) : null;
    if (isSubmittedRfqStatus(rfqStatus)) {
      return { allowed: true, reason: "rfq_submitted", rfqStatus };
    }
    return { allowed: false, reason: "rfq_not_submitted", rfqStatus };
  };

  return {
    assertCopyAllowed: async (dbName: string, pqDocEntry: number): Promise<void> => {
      const eligibility = await getEligibility(dbName, pqDocEntry);
      if (!eligibility.allowed) {
        throw new AppError(PQ_RFQ_COPY_BLOCKED_MESSAGE, 409, "IC_PQ_COPY_BLOCKED");
      }
    },
    assertLinesCopyAllowed: async (dbName: string, lines: unknown[]): Promise<void> => {
      const entries = collectPqBaseEntries(lines);
      for (const entry of entries) {
        const eligibility = await getEligibility(dbName, entry);
        if (!eligibility.allowed) {
          throw new AppError(PQ_RFQ_COPY_BLOCKED_MESSAGE, 409, "IC_PQ_COPY_BLOCKED");
        }
      }
    },
    getEligibility,
    /**
     * `null` = no extra list filter (Flow 1 off or company is not IC).
     * Empty array = Flow 1 on and no submitted RFQs.
     */
    listAllowedDocEntries: async (dbName: string): Promise<number[] | null> => {
      const flow1On = await configuration.isFlow1Enabled();
      if (!flow1On) {
        return null;
      }
      const icCompany = await company.getBySapDbName(dbName.trim());
      if (!icCompany) {
        return null;
      }
      return rfq.listSubmittedSourcePqEntries(icCompany.companyId);
    },
  };
};

const pqCopyEligibility = createPqCopyEligibility();

const withEligibilityFallback = async <T>(
  fallback: T,
  run: () => Promise<T>,
  msg: string,
): Promise<T> => {
  try {
    return await run();
  } catch (error: unknown) {
    logger.error({
      err: error instanceof Error ? error : new Error(String(error)),
      msg,
    });
    return fallback;
  }
};

export const getPqCopyEligibility = (
  dbName: string,
  pqDocEntry: number,
): Promise<PqCopyEligibility> =>
  withEligibilityFallback(
    { allowed: true, reason: "flow1_disabled", rfqStatus: null },
    () => pqCopyEligibility.getEligibility(dbName, pqDocEntry),
    "PQ copy eligibility lookup failed; allowing copy",
  );

export const assertPqCopyAllowed = (dbName: string, pqDocEntry: number): Promise<void> =>
  pqCopyEligibility.assertCopyAllowed(dbName, pqDocEntry);

export const assertPqLinesCopyAllowed = (dbName: string, lines: unknown[]): Promise<void> =>
  pqCopyEligibility.assertLinesCopyAllowed(dbName, lines);

export const listPqCopyAllowedDocEntries = (dbName: string): Promise<number[] | null> =>
  withEligibilityFallback(
    null,
    () => pqCopyEligibility.listAllowedDocEntries(dbName),
    "PQ copy-allowed list lookup failed; skipping filter",
  );
