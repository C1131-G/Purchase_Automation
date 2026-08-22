import { IC_LOG_SCOPE, icLog } from "@/modules/intercompany/infrastructure/ic-logger";
import type { IcSalesQuotationSnapshot } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";

import { buildPosParkedInvoiceData } from "./parked-invoice.payload";
import {
  createParkedTransactionRepository,
  type ParkedTransactionRepository,
} from "./parked-transaction.repository";
import type {
  ParkedTransactionResult,
  PosParkContext,
  PosParkedInvoiceData,
} from "./parked-transaction.types";

export type ParkTransactionInput = {
  buyerCompanyId: number;
  buyerCompanyName: string;
  corrId?: string;
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
  const traceFields = (input: ParkTransactionInput) => ({
    buyerCompanyId: input.buyerCompanyId,
    corrId: input.corrId,
    poDocEntry: input.poDocEntry,
    poDocNum: input.poDocNum,
    route: "PARKED_TRANSACTION",
    sellerCompanyId: input.sellerCompanyId,
    sqDocEntry: input.snapshot.docEntry,
    sqDocNum: input.snapshot.docNum,
    transactionId: input.transactionId,
  });
  return {
    park: async (input) => {
      let parkedData: PosParkedInvoiceData;
      try {
        parkedData = build(input);
      } catch (err: unknown) {
        icLog.error(IC_LOG_SCOPE.FLOW2, "IC Flow 2 POS parked payload validation failed", {
          ...traceFields(input),
          check: "parked_payload_validation",
          err: err instanceof Error ? err : new Error(String(err)),
          outcome: "fail",
        });
        throw err;
      }
      const warehouseCodes = [...new Set(parkedData.salesItems.map((line) => line.WhsCode))];
      icLog.info(IC_LOG_SCOPE.FLOW2, "IC Flow 2 POS parked payload validated", {
        ...traceFields(input),
        check: "parked_payload_validated",
        lineCount: parkedData.salesItems.length,
        outcome: "pass",
        totalAmount: parkedData.parkedTransaction.TotalAmount,
        warehouseCodes,
      });

      let pos: PosParkContext;
      try {
        pos = await repository.resolvePosContext(input.sellerDbName, warehouseCodes);
      } catch (err: unknown) {
        icLog.error(IC_LOG_SCOPE.FLOW2, "IC Flow 2 POS context resolution failed", {
          ...traceFields(input),
          check: "parked_pos_context_resolve",
          err: err instanceof Error ? err : new Error(String(err)),
          outcome: "fail",
          warehouseCodes,
        });
        throw err;
      }
      icLog.info(IC_LOG_SCOPE.FLOW2, "IC Flow 2 POS store and counter resolved", {
        ...traceFields(input),
        check: "parked_pos_context_resolved",
        counterCode: pos.counterCode,
        counterUserAssigned: pos.userId !== null,
        outcome: "pass",
        storeCounterId: pos.storeCounterId,
        storeId: pos.storeId,
        warehouseCodes,
      });

      let result: ParkedTransactionResult;
      try {
        result = await repository.createOrReuse({
          data: parkedData,
          dbName: input.sellerDbName,
          pos,
          transactionId: input.transactionId,
          userName: input.portalCreatedBy?.trim() || "IC Integration",
        });
      } catch (err: unknown) {
        icLog.error(IC_LOG_SCOPE.FLOW2, "IC Flow 2 POS parked row persistence failed", {
          ...traceFields(input),
          check: "parked_transaction_persist",
          err: err instanceof Error ? err : new Error(String(err)),
          outcome: "fail",
          storeCounterId: pos.storeCounterId,
          storeId: pos.storeId,
        });
        throw err;
      }
      icLog.info(IC_LOG_SCOPE.FLOW2, "IC Flow 2 POS parked invoice persisted", {
        ...traceFields(input),
        check: result.reused ? "parked_transaction_reused" : "parked_transaction_created",
        outcome: "pass",
        parkedTransactionId: result.parkedTransactionId,
        transactionRefNum: result.transactionRefNum,
        storeCounterId: pos.storeCounterId,
        storeId: pos.storeId,
        warehouseCodes,
      });
      return result;
    },
    update: async (input) => {
      let parkedData: PosParkedInvoiceData;
      try {
        parkedData = build(input);
      } catch (err: unknown) {
        icLog.error(IC_LOG_SCOPE.EDIT, "IC PO edit parked payload validation failed", {
          ...traceFields(input),
          check: "parked_edit_payload_validation",
          err: err instanceof Error ? err : new Error(String(err)),
          outcome: "fail",
          parkedTransactionId: input.parkedTransactionId,
        });
        throw err;
      }
      const warehouseCodes = [...new Set(parkedData.salesItems.map((line) => line.WhsCode))];
      icLog.info(IC_LOG_SCOPE.EDIT, "IC PO edit rebuilt POS parked payload", {
        ...traceFields(input),
        check: "parked_edit_payload_validated",
        lineCount: parkedData.salesItems.length,
        outcome: "pass",
        parkedTransactionId: input.parkedTransactionId,
        totalAmount: parkedData.parkedTransaction.TotalAmount,
        warehouseCodes,
      });
      let updated: boolean;
      try {
        updated = await repository.updateData(
          input.sellerDbName,
          input.parkedTransactionId,
          parkedData,
        );
      } catch (err: unknown) {
        icLog.error(IC_LOG_SCOPE.EDIT, "IC PO edit failed to update POS parked row", {
          ...traceFields(input),
          check: "parked_edit_update",
          err: err instanceof Error ? err : new Error(String(err)),
          outcome: "fail",
          parkedTransactionId: input.parkedTransactionId,
        });
        throw err;
      }
      icLog.info(
        IC_LOG_SCOPE.EDIT,
        updated ? "IC PO edit updated POS parked row" : "IC PO edit found POS parked row consumed",
        {
          ...traceFields(input),
          check: updated ? "parked_edit_updated" : "parked_transaction_consumed",
          outcome: updated ? "pass" : "skip",
          parkedTransactionId: input.parkedTransactionId,
          warehouseCodes,
        },
      );
      return updated ? { kind: "updated" } : { kind: "consumed" };
    },
  };
};

export const parkTransactionService = createParkTransactionService();
