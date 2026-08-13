import { logger } from "@/core/logger/pino-logger";
import { createCompanyService } from "@/modules/intercompany/config/company/company.service";
import { createUpdateArDraftService } from "@/modules/intercompany/flows/flow-2-po-to-ar-invoice/update-ar-draft.service";
import { acceptedResult, type IcHookResult } from "@/modules/intercompany/flows/shared/flow-result";
import type { IcPoHookInput } from "@/modules/intercompany/flows/shared/flow.types";
import { scheduleIcBackground } from "@/modules/intercompany/infrastructure/schedule-ic-background";

export const afterPoUpdated = async (input: IcPoHookInput): Promise<IcHookResult> => {
  scheduleIcBackground(
    { dbName: input.dbName, docEntry: input.docEntry, flow: "flow2", hook: "afterPoUpdated" },
    async () => {
      try {
        const company = await createCompanyService().getBySapDbName(input.dbName);
        if (company) {
          await createUpdateArDraftService().update({
            buyerCompanyId: company.companyId,
            purchaseOrder: input,
          });
        }
        return { status: "success" };
      } catch (error: unknown) {
        logger.error({
          err: error instanceof Error ? error : new Error(String(error)),
          msg: "afterPoUpdated failed; PO remains saved",
        });
        return { message: String(error), status: "failed" };
      }
    },
  );
  return acceptedResult("flow2");
};
