import { IC_LOG_SCOPE, icLog } from "@/modules/intercompany/infrastructure/ic-logger";
import type { IcSalesQuotationSnapshot } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";

import { buildPosParkedInvoiceData } from "./parked-invoice.payload";
import {
  createParkedTransactionRepository,
  type ParkedTransactionRepository,
} from "./parked-transaction.repository";
import type { ParkedTransactionResult } from "./parked-transaction.types";

export type ParkTransactionInput = {
  buyerCompanyId: number;
  buyerCompanyName: string;
  customerCode: string;
  poDocEntry: number;
  poDocNum?: number | null;
  portalCreatedBy?: string;
  salesPersonCode?: number | string | null;
  sellerDbName: string;
  sellerCompanyId: number;
  snapshot: IcSalesQuotationSnapshot;
  sourceDocEntry: string;
  transactionId: string;
};

export type ParkTransactionService = {
  park: (input: ParkTransactionInput) => Promise<ParkedTransactionResult>;
  update: (
    input: ParkTransactionInput & { parkedTransactionId: number },
  ) => Promise<{ kind: "updated" } | { kind: "consumed" }>;
};

export const createParkTransactionService = (deps?: {
  repository?: ParkedTransactionRepository;
}): ParkTransactionService => {
  const repository = deps?.repository ?? createParkedTransactionRepository();
  const build = (input: ParkTransactionInput) => buildPosParkedInvoiceData(input);
  return {
    park: async (input) => {
      const data = build(input);
      const warehouseCodes = data.salesItems.map((line) => line.WhsCode);
      const pos = await repository.resolvePosContext(input.sellerDbName, warehouseCodes);
      const result = await repository.createOrReuse({
        data,
        dbName: input.sellerDbName,
        pos,
        transactionId: input.transactionId,
        userName: input.portalCreatedBy?.trim() || "IC Integration",
      });
      icLog.info(IC_LOG_SCOPE.FLOW2, "IC Flow 2 POS parked invoice persisted", {
        check: result.reused ? "parked_transaction_reused" : "parked_transaction_created",
        outcome: "pass",
        parkedTransactionId: result.parkedTransactionId,
        sellerDbName: input.sellerDbName,
        storeCounterId: pos.storeCounterId,
        storeId: pos.storeId,
        transactionId: input.transactionId,
        warehouseCodes: [...new Set(warehouseCodes)],
      });
      return result;
    },
    update: async (input) => {
      const updated = await repository.updateData(
        input.sellerDbName,
        input.parkedTransactionId,
        build(input),
      );
      return updated ? { kind: "updated" } : { kind: "consumed" };
    },
  };
};

export const parkTransactionService = createParkTransactionService();
