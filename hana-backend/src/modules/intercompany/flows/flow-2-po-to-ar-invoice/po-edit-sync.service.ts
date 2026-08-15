/**
 * IC edit sync — portal PO update → existing seller A/R draft.
 * Never posts a new draft and never uses Flow 2 (1–9) create logs.
 */

import { randomUUID } from "node:crypto";

import type { CompanyService } from "@/modules/intercompany/config/company/company.service";
import { createCompanyService } from "@/modules/intercompany/config/company/company.service";
import type { DocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import { createDocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import { skipResult, type IcHookResult } from "@/modules/intercompany/flows/shared/flow-result";
import type { IcPoHookInput } from "@/modules/intercompany/flows/shared/flow.types";
import { IC_DOC_MAP_STATUS } from "@/modules/intercompany/infrastructure/constants";
import {
  logIcEditSync,
  summarizeIcLines,
} from "@/modules/intercompany/infrastructure/flow-step-log";
import { IC_OBJECT } from "@/modules/intercompany/infrastructure/object-codes";

import { createUpdateArDraftService, type UpdateArDraftService } from "./update-ar-draft.service";

export type PoEditSyncService = {
  sync: (input: IcPoHookInput) => Promise<IcHookResult>;
};

export const createPoEditSyncService = (deps?: {
  company?: CompanyService;
  documentMap?: DocumentMapService;
  updateArDraft?: UpdateArDraftService;
}): PoEditSyncService => {
  const company = deps?.company ?? createCompanyService();
  const documentMap = deps?.documentMap ?? createDocumentMapService();
  const updateArDraft = deps?.updateArDraft ?? createUpdateArDraftService({ documentMap });

  return {
    sync: async (input) => {
      const startedAt = Date.now();
      const corrId = randomUUID();
      const logCtx = {
        cardCode: input.cardCode,
        corrId,
        dbName: input.dbName,
        docEntry: input.docEntry,
        docNum: input.docNum,
        flow: "edit" as const,
      };
      const lineSnap = summarizeIcLines(input.lines as unknown[] | undefined);

      logIcEditSync({
        ctx: logCtx,
        detail: {
          hook: "afterPoUpdated",
          sourceObject: IC_OBJECT.PO,
          targetObject: IC_OBJECT.AR_DRAFT,
        },
        phase: "start",
      });

      logIcEditSync({
        ctx: logCtx,
        detail: {
          itemCodes: lineSnap.itemCodes,
          lineCount: lineSnap.lineCount,
          lines: lineSnap.lines,
        },
        phase: "input",
      });

      const finish = (result: IcHookResult, extra?: Record<string, unknown>): IcHookResult => {
        const skipped = result.status === "skipped";
        logIcEditSync({
          check: skipped ? `ic_edit_sync.${result.reason}` : "ic_edit_sync",
          ctx: logCtx,
          detail: {
            durationMs: Date.now() - startedAt,
            reason: skipped ? result.reason : undefined,
            status: result.status,
            ...extra,
          },
          outcome: result.status === "failed" ? "fail" : skipped ? "skip" : "pass",
          phase: skipped
            ? `skipped (${result.reason})`
            : result.status === "failed"
              ? "failed"
              : "done",
        });
        return result;
      };

      const icCompany = await company.getBySapDbName(input.dbName.trim());
      if (!icCompany) {
        logIcEditSync({
          check: "ic_edit_sync.not_ic_company",
          ctx: logCtx,
          outcome: "skip",
          phase: "not an IC company",
        });
        return finish(skipResult("not_ic_company"));
      }

      const invoiceMap = await documentMap.findBySource({
        sourceCompanyId: icCompany.companyId,
        sourceDocEntry: String(input.docEntry),
        sourceObject: IC_OBJECT.PO,
        targetObject: IC_OBJECT.AR_INVOICE,
      });
      if (invoiceMap?.status === IC_DOC_MAP_STATUS.SUCCESS) {
        logIcEditSync({
          check: "ic_edit_sync.invoice_posted",
          ctx: logCtx,
          detail: { mappingId: invoiceMap.mappingId },
          outcome: "skip",
          phase: "A/R invoice already posted",
        });
        return finish(skipResult("invoice_posted"));
      }

      const draftMap = await documentMap.findBySource({
        sourceCompanyId: icCompany.companyId,
        sourceDocEntry: String(input.docEntry),
        sourceObject: IC_OBJECT.PO,
        targetObject: IC_OBJECT.AR_DRAFT,
      });
      const draftEntry = Number(draftMap?.targetDocEntry);
      if (
        !draftMap ||
        !draftMap.targetCompanyId ||
        !Number.isFinite(draftEntry) ||
        draftEntry <= 0
      ) {
        logIcEditSync({
          check: "ic_edit_sync.no_ar_draft",
          ctx: logCtx,
          outcome: "skip",
          phase: "no A/R draft (create is Flow 2 only)",
        });
        return finish(skipResult("no_ar_draft"));
      }

      logIcEditSync({
        ctx: logCtx,
        detail: {
          draftEntry,
          mappingId: draftMap.mappingId,
          targetCompanyId: draftMap.targetCompanyId,
        },
        phase: "resolve A/R draft",
      });

      logIcEditSync({
        ctx: logCtx,
        detail: { draftEntry, mappingId: draftMap.mappingId },
        phase: "apply buyer fields",
      });

      await updateArDraft.update({
        buyerCompanyId: icCompany.companyId,
        purchaseOrder: input,
      });

      return finish(
        {
          status: "success",
          targetDoc: { entry: draftEntry, type: IC_OBJECT.AR_DRAFT },
        },
        { draftEntry, mappingId: draftMap.mappingId },
      );
    },
  };
};

export const poEditSyncService = createPoEditSyncService();
