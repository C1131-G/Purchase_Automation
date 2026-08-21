import { IC_RFQ_STATUS } from "@/modules/intercompany/infrastructure/constants";

import { createRfqMutations, type RfqMutations } from "./rfq.mutations";
import { createRfqQueries, type RfqQueries } from "./rfq.queries";
import type {
  CreateRfqFromDraftInput,
  IcRfqHeader,
  UpdateRfqExtras,
  UpdateRfqLineInput,
} from "./rfq.types";

export type RfqService = {
  createFromDraft: (input: CreateRfqFromDraftInput) => Promise<IcRfqHeader>;
  /** @param withLines default true; pass false for header-only (e.g. relationship map). */
  getById: (rfqId: number, withLines?: boolean) => Promise<IcRfqHeader | null>;
  findBySourceDraft: (
    sourceCompanyId: number,
    pqDraftDocEntry: number,
  ) => Promise<IcRfqHeader | null>;
  /**
   * Resolve RFQ from PO/PQ remarks refs (DocNum preferred in SAP comments).
   * Falls back across PQ entry, PQ num, and RFQ_NUMBER.
   */
  findBySourceRemarkRef: (
    sourceCompanyId: number,
    remarkRef: number | string,
  ) => Promise<IcRfqHeader | null>;
  /** Seller inbox — only RFQs where company is target (not buyer). */
  listForCompany: (companyId: number) => Promise<IcRfqHeader[]>;
  listSubmittedSourcePqEntries: (sourceCompanyId: number) => Promise<number[]>;
  updateLines: (
    rfqId: number,
    lines: UpdateRfqLineInput[],
    extras?: UpdateRfqExtras,
  ) => Promise<IcRfqHeader | null>;
  submit: (rfqId: number) => Promise<IcRfqHeader | null>;
  complete: (rfqId: number) => Promise<IcRfqHeader | null>;
};

export const createRfqService = (deps?: {
  queries?: RfqQueries;
  mutations?: RfqMutations;
}): RfqService => {
  const queries = deps?.queries ?? createRfqQueries();
  const mutations = deps?.mutations ?? createRfqMutations();

  return {
    complete: (rfqId) => mutations.setStatus(rfqId, IC_RFQ_STATUS.COMPLETED),

    createFromDraft: async (input) => {
      const existing = await queries.findBySourceDraft(
        input.sourceCompanyId,
        input.pqDraftDocEntry,
      );
      if (existing) {
        return (await queries.getById(existing.rfqId)) ?? existing;
      }
      return mutations.insertFromDraft(input);
    },

    findBySourceDraft: (sourceCompanyId, pqDraftDocEntry) =>
      queries.findBySourceDraft(sourceCompanyId, pqDraftDocEntry),

    findBySourceRemarkRef: (sourceCompanyId, remarkRef) =>
      queries.findBySourceRemarkRef(sourceCompanyId, remarkRef),

    getById: (rfqId, withLines = true) => queries.getById(rfqId, withLines),

    listForCompany: (companyId) => queries.listForCompany(companyId),

    listSubmittedSourcePqEntries: (sourceCompanyId) =>
      queries.listSubmittedSourcePqEntries(sourceCompanyId),

    submit: (rfqId) => mutations.setStatus(rfqId, IC_RFQ_STATUS.SUBMITTED),

    updateLines: (rfqId, lines, extras) => mutations.updateLines(rfqId, lines, extras),
  };
};

export const rfqService = createRfqService();
