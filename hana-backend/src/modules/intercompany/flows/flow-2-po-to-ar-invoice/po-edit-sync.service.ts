/**
 * IC edit sync — portal PO update → existing seller A/R draft or POS parked row.
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
import {
  createBuildArInvoiceService,
  type BuildArInvoiceService,
} from "./02-build-ar-invoice/build-ar-invoice.service";
import {
  createParkTransactionService,
  type ParkTransactionService,
} from "./03-park-transaction/park-transaction.service";
import type { ResolvePartnerService } from "@/modules/intercompany/routing/resolve-partner/resolve-partner.service";
import { createResolvePartnerService } from "@/modules/intercompany/routing/resolve-partner/resolve-partner.service";

export type PoEditSyncService = {
  sync: (input: IcPoHookInput) => Promise<IcHookResult>;
};

export const createPoEditSyncService = (deps?: {
  company?: CompanyService;
  documentMap?: DocumentMapService;
  updateArDraft?: UpdateArDraftService;
  build?: BuildArInvoiceService;
  park?: ParkTransactionService;
  resolvePartner?: ResolvePartnerService;
}): PoEditSyncService => {
  const company = deps?.company ?? createCompanyService();
  const documentMap = deps?.documentMap ?? createDocumentMapService();
  const updateArDraft = deps?.updateArDraft ?? createUpdateArDraftService({ documentMap });
  const build = deps?.build ?? createBuildArInvoiceService({ documentMap });
  const park = deps?.park ?? createParkTransactionService();
  const resolvePartner = deps?.resolvePartner ?? createResolvePartnerService();

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
          route: "UNRESOLVED",
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
      logIcEditSync({
        check: "ic_edit_sync.company_resolved",
        ctx: logCtx,
        detail: { buyerCompanyId: icCompany.companyId },
        phase: "buyer IC company resolved",
      });

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

      const parkedMap = await documentMap.findBySource({
        sourceCompanyId: icCompany.companyId,
        sourceDocEntry: String(input.docEntry),
        sourceObject: IC_OBJECT.PO,
        targetObject: IC_OBJECT.PARKED_TRANSACTION,
      });
      const parkedTransactionId = Number(parkedMap?.targetDocEntry);
      if (
        parkedMap?.status === IC_DOC_MAP_STATUS.SUCCESS &&
        parkedMap.targetCompanyId &&
        Number.isFinite(parkedTransactionId) &&
        parkedTransactionId > 0
      ) {
        logIcEditSync({
          check: "ic_edit_sync.route_resolved",
          ctx: logCtx,
          detail: {
            mappingId: parkedMap.mappingId,
            parkedTransactionId,
            route: IC_OBJECT.PARKED_TRANSACTION,
            sellerCompanyId: parkedMap.targetCompanyId,
          },
          phase: "POS parked route resolved",
        });
        const resolved = await resolvePartner.resolveOutcome({
          cardCode: input.cardCode,
          dbName: input.dbName,
        });
        if (!resolved.success) {
          return finish(skipResult(resolved.reason), {
            route: IC_OBJECT.PARKED_TRANSACTION,
          });
        }
        logIcEditSync({
          check: "ic_edit_sync.parked_partner_resolved",
          ctx: logCtx,
          detail: {
            buyerCompanyId: resolved.partner.buyerCompany.companyId,
            route: IC_OBJECT.PARKED_TRANSACTION,
            sellerCompanyId: resolved.partner.sellerCompany.companyId,
          },
          phase: "parked partner resolved",
        });
        const built = await build.build({
          input,
          partner: resolved.partner,
          remarksTag: parkedMap.sourceRemarksTag ?? `IC-PO-${input.docEntry}`,
        });
        const transactionId = `IC-PO-${icCompany.companyId}-${input.docEntry}`;
        logIcEditSync({
          check: "ic_edit_sync.parked_sq_loaded",
          ctx: logCtx,
          detail: {
            lineCount: built.salesQuotation.documentLines.length,
            parkedTransactionId,
            route: IC_OBJECT.PARKED_TRANSACTION,
            sqDocEntry: built.salesQuotation.docEntry,
            sqDocNum: built.salesQuotation.docNum,
            transactionId,
          },
          phase: "seller SQ rebuilt for parked edit",
        });
        const outcome = await park.update({
          buyerCompanyId: icCompany.companyId,
          buyerCompanyName: resolved.partner.buyerCompany.companyName,
          corrId,
          customerCode: resolved.partner.buyerCustomerCode,
          parkedTransactionId,
          poDocEntry: input.docEntry,
          poDocNum: input.docNum,
          portalCreatedBy: input.portalCreatedBy,
          salesPersonCode: input.salesPersonCode,
          sellerCompanyId: resolved.partner.sellerCompany.companyId,
          sellerDbName: resolved.partner.sellerCompany.sapDbName,
          snapshot: built.salesQuotation,
          sourceDocEntry: String(input.docEntry),
          transactionId,
        });
        if (outcome.kind === "consumed") {
          return finish(skipResult("parked_transaction_consumed"), {
            parkedTransactionId,
            mappingId: parkedMap.mappingId,
            route: IC_OBJECT.PARKED_TRANSACTION,
            transactionId,
          });
        }
        return finish(
          {
            status: "success",
            targetDoc: { entry: parkedTransactionId, type: IC_OBJECT.PARKED_TRANSACTION },
          },
          {
            parkedTransactionId,
            mappingId: parkedMap.mappingId,
            route: IC_OBJECT.PARKED_TRANSACTION,
            transactionId,
          },
        );
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
        check: "ic_edit_sync.route_resolved",
        ctx: logCtx,
        detail: {
          draftEntry,
          mappingId: draftMap.mappingId,
          route: IC_OBJECT.AR_DRAFT,
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
        trace: { corrId },
      });

      return finish(
        {
          status: "success",
          targetDoc: { entry: draftEntry, type: IC_OBJECT.AR_DRAFT },
        },
        { draftEntry, mappingId: draftMap.mappingId, route: IC_OBJECT.AR_DRAFT },
      );
    },
  };
};

export const poEditSyncService = createPoEditSyncService();
