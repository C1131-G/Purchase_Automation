import AppError from "@/core/errors/app-error";
import type { CompanyService } from "@/modules/intercompany/config/company/company.service";
import { createCompanyService } from "@/modules/intercompany/config/company/company.service";
import type { DocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import { createDocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import type { RfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import { createRfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import { createIcEditLocks } from "@/modules/intercompany/flows/shared/ic-edit-lock";
import type { IcRfqHeader } from "@/modules/intercompany/domain/rfq/rfq.types";
import { IC_DOC_MAP_STATUS } from "@/modules/intercompany/infrastructure/constants";
import { IC_OBJECT } from "@/modules/intercompany/infrastructure/object-codes";

const SAP_BASE_TYPE_PURCHASE_QUOTATION = 540000006;

export type SapBaseDocumentLine = {
  BaseEntry?: unknown;
  BaseType?: unknown;
};

export const resolveSinglePqBaseEntry = (lines: SapBaseDocumentLine[]): number | undefined => {
  if (lines.length === 0) {
    return undefined;
  }
  const entries = new Set<number>();
  for (const line of lines) {
    const baseEntry = Number(line.BaseEntry);
    const baseType = Number(line.BaseType);
    if (
      baseType !== SAP_BASE_TYPE_PURCHASE_QUOTATION ||
      !Number.isFinite(baseEntry) ||
      baseEntry <= 0
    ) {
      return undefined;
    }
    entries.add(Math.trunc(baseEntry));
  }
  return entries.size === 1 ? entries.values().next().value : undefined;
};

export const createIcEditLifecycle = (deps?: {
  company?: CompanyService;
  documentMap?: DocumentMapService;
  rfq?: RfqService;
}) => {
  const company = deps?.company ?? createCompanyService();
  const documentMap = deps?.documentMap ?? createDocumentMapService();
  const locks = createIcEditLocks({ documentMap, rfq: deps?.rfq ?? createRfqService() });

  const resolveCompanyId = async (dbName: string): Promise<number | undefined> =>
    (await company.getBySapDbName(dbName.trim()))?.companyId;

  return {
    assertPoEditable: async (dbName: string, docEntry: number): Promise<void> => {
      const companyId = await resolveCompanyId(dbName);
      if (companyId === undefined) return;
      const lock = await locks.checkPoEditLock(companyId, docEntry);
      if (lock.locked) {
        throw new AppError(lock.reason ?? "Purchase order is locked", 409, "IC_PO_LOCKED");
      }
    },
    assertPqEditable: async (dbName: string, docEntry: number): Promise<void> => {
      const companyId = await resolveCompanyId(dbName);
      if (companyId === undefined) return;
      const lock = await locks.checkPqEditLock(companyId, docEntry);
      if (lock.locked) {
        throw new AppError(lock.reason ?? "Purchase quotation is locked", 409, "IC_PQ_LOCKED");
      }
    },
    assertSqEditable: async (dbName: string, docEntry: number): Promise<void> => {
      const companyId = await resolveCompanyId(dbName);
      if (companyId === undefined) return;
      const map = await documentMap.findByTarget({
        sourceObject: IC_OBJECT.RFQ,
        targetCompanyId: companyId,
        targetDocEntry: String(docEntry),
        targetObject: IC_OBJECT.SQ,
      });
      if (map) {
        throw new AppError("IC Sales Quotation is read-only", 409, "IC_SQ_LOCKED");
      }
    },
    attachRfqEditFlags: async (header: IcRfqHeader): Promise<IcRfqHeader> => ({
      ...header,
      pqCopiedToPo: await locks.isPqCopiedToPo(header.sourceCompanyId, header.pqDraftDocEntry),
    }),
    recordPqToPoLink: async (input: {
      dbName: string;
      lines: SapBaseDocumentLine[];
      poDocEntry: number;
      poDocNum?: number | null;
    }): Promise<void> => {
      const sourceDocEntry = resolveSinglePqBaseEntry(input.lines);
      if (sourceDocEntry === undefined) return;
      const companyId = await resolveCompanyId(input.dbName);
      if (companyId === undefined) return;
      const rfqMap = await documentMap.findBySource({
        sourceCompanyId: companyId,
        sourceDocEntry: String(sourceDocEntry),
        sourceObject: IC_OBJECT.PQ,
        targetObject: IC_OBJECT.RFQ,
      });
      if (rfqMap?.status !== IC_DOC_MAP_STATUS.SUCCESS) return;
      await documentMap.create({
        sourceCompanyId: companyId,
        sourceDocEntry: String(sourceDocEntry),
        sourceObject: IC_OBJECT.PQ,
        status: IC_DOC_MAP_STATUS.SUCCESS,
        targetCompanyId: companyId,
        targetDocEntry: String(input.poDocEntry),
        targetDocNum: input.poDocNum == null ? null : String(input.poDocNum),
        targetObject: IC_OBJECT.PO,
      });
    },
  };
};

const icEditLifecycle = createIcEditLifecycle();

export const assertIcPoEditable = icEditLifecycle.assertPoEditable;
export const assertIcPqEditable = icEditLifecycle.assertPqEditable;
export const assertIcSqEditable = icEditLifecycle.assertSqEditable;
export const attachIcRfqEditFlags = icEditLifecycle.attachRfqEditFlags;
export const recordIcPqToPoLink = icEditLifecycle.recordPqToPoLink;
