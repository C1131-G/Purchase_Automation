import { IC_RFQ_STATUS } from "@/modules/intercompany/infrastructure/constants";

import { createRfqMutations, type RfqMutations } from "./rfq.mutations";
import { createRfqQueries, type RfqQueries } from "./rfq.queries";
import type { CreateRfqFromDraftInput, IcRfqHeader, UpdateRfqLineInput } from "./rfq.types";

export type RfqService = {
  createFromDraft: (input: CreateRfqFromDraftInput) => Promise<IcRfqHeader>;
  getById: (rfqId: number) => Promise<IcRfqHeader | null>;
  findBySourceDraft: (
    sourceCompanyId: number,
    pqDraftDocEntry: number,
  ) => Promise<IcRfqHeader | null>;
  /** Seller inbox — only RFQs where company is target (not buyer). */
  listForCompany: (companyId: number) => Promise<IcRfqHeader[]>;
  updateLines: (rfqId: number, lines: UpdateRfqLineInput[]) => Promise<IcRfqHeader | null>;
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

    getById: (rfqId) => queries.getById(rfqId, true),

    listForCompany: (companyId) => queries.listForCompany(companyId),

    submit: (rfqId) => mutations.setStatus(rfqId, IC_RFQ_STATUS.SUBMITTED),

    updateLines: (rfqId, lines) => mutations.updateLines(rfqId, lines),
  };
};

export const rfqService = createRfqService();
