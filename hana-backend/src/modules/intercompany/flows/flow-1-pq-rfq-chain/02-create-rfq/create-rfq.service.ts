import type { DocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import { createDocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import type { RfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import { createRfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import { IC_DOC_MAP_STATUS } from "@/modules/intercompany/infrastructure/constants";
import { logFlowStep } from "@/modules/intercompany/infrastructure/flow-step-log";
import { buildFlow1RfqRemarks } from "@/modules/intercompany/infrastructure/ic-remarks-chain";
import { IC_LOG_SCOPE } from "@/modules/intercompany/infrastructure/ic-logger";
import { IC_OBJECT } from "@/modules/intercompany/infrastructure/object-codes";
import { partnerWarehouseMasters } from "@/modules/intercompany/config/warehouse/partner-warehouse.masters";
import { resolveItemSalesUom } from "@/modules/master-data/master-data.warehouses-series.queries";

import {
  mapSourceItemsToPartnerItems,
  type PartnerItemMapEntry,
} from "@/modules/intercompany/config/item-mapping/partner-item.mapping";

import { buildRfqNumber, mapDraftLinesToRfqLines } from "./build-rfq-from-pq";
import type { CreateRfqFromCaptureInput, CreateRfqFromCaptureResult } from "./create-rfq.types";

const SCOPE = IC_LOG_SCOPE.FLOW1;

export type CreateRfqService = {
  create: (input: CreateRfqFromCaptureInput) => Promise<CreateRfqFromCaptureResult>;
};

export const createCreateRfqService = (deps?: {
  rfq?: RfqService;
  documentMap?: DocumentMapService;
  /** Injectable for unit tests — defaults to OSCN Substitute map on buyer → seller OITM. */
  mapItems?: (input: {
    sourceDbName: string;
    partnerCardCode: string;
    itemCodes: string[];
    targetDbName: string;
  }) => Promise<Map<string, PartnerItemMapEntry>>;
  /** Seller item-master sales UoM stored on RFQ — convert copies this, does not re-pick. */
  resolveSalesUom?: (
    itemCode: string,
  ) => Promise<{ uomCode: string; uomEntry: number | null } | null>;
  /**
   * OSCN.U_Warehouse / U_Warhouse (code or description) → seller OWHS.
   * Convert copies this RFQ warehouse; buyer PQ warehouse is never stored.
   */
  resolveWarehouse?: (
    warehouseHint: string,
  ) => Promise<{ warehouseCode: string; branchId: number | null } | null>;
}): CreateRfqService => {
  const rfq = deps?.rfq ?? createRfqService();
  const documentMap = deps?.documentMap ?? createDocumentMapService();
  const mapItems = deps?.mapItems ?? mapSourceItemsToPartnerItems;

  return {
    create: async (input) => {
      const existing = await rfq.findBySourceDraft(
        input.partner.buyerCompany.companyId,
        Number(input.sourceDocEntry),
      );

      if (existing) {
        const withLines = (await rfq.getById(existing.rfqId)) ?? existing;
        const map =
          (await documentMap.findBySource({
            sourceCompanyId: input.partner.buyerCompany.companyId,
            sourceDocEntry: input.sourceDocEntry,
            sourceObject: IC_OBJECT.PQ,
            targetObject: IC_OBJECT.RFQ,
          })) ??
          (await documentMap.findBySource({
            sourceCompanyId: input.partner.buyerCompany.companyId,
            sourceDocEntry: input.sourceDocEntry,
            sourceObject: IC_OBJECT.PQ_DRAFT,
            targetObject: IC_OBJECT.RFQ,
          }));
        logFlowStep(SCOPE, {
          step: 5,
          total: 18,
          title: "Flow 1 create RFQ — idempotent hit (existing)",
          check: "create_rfq_existing",
          detail: {
            created: false,
            mappingId: map?.mappingId ?? 0,
            rfqId: withLines.rfqId,
            rfqNumber: withLines.rfqNumber,
            sourceDocEntry: input.sourceDocEntry,
          },
        });
        return {
          created: false,
          mappingId: map?.mappingId ?? 0,
          rfq: withLines,
        };
      }

      const sourceItemCodes = (input.lines ?? []).map((line) =>
        String(line.ItemCode ?? (line as { itemCode?: unknown }).itemCode ?? "").trim(),
      );
      const partnerItemMap = await mapItems({
        sourceDbName: input.partner.buyerCompany.sapDbName,
        partnerCardCode: input.partner.vendorCode,
        itemCodes: sourceItemCodes,
        targetDbName: input.partner.sellerCompany.sapDbName,
      });

      const sellerDb = input.partner.sellerCompany.sapDbName?.trim() || "";
      const resolveSalesUom =
        deps?.resolveSalesUom ??
        (sellerDb && process.env.VITEST !== "true"
          ? (itemCode: string) => resolveItemSalesUom(sellerDb, itemCode)
          : null);
      const resolveWarehouse =
        deps?.resolveWarehouse ??
        (sellerDb && process.env.VITEST !== "true"
          ? (warehouseHint: string) =>
              partnerWarehouseMasters.resolveWarehouseByCodeOrName(sellerDb, warehouseHint)
          : null);

      const mappedLines = mapDraftLinesToRfqLines(input.lines);
      const lines: ReturnType<typeof mapDraftLinesToRfqLines> = [];
      for (const line of mappedLines) {
        const mapped = partnerItemMap.get(line.itemCode);
        if (!mapped) {
          throw new Error(
            `IC OSCN mapping missing for buyer ItemCode=${line.itemCode} CardCode=${input.partner.vendorCode}`,
          );
        }
        const sales =
          resolveSalesUom != null ? await resolveSalesUom(mapped.partnerItemCode) : null;
        const salesCode = sales?.uomCode?.trim() || "";
        const useSales = Boolean(salesCode) && !/^manual$/i.test(salesCode);
        const warehouseHint = mapped.warehouseHint?.trim() || "";
        const sellerWh =
          resolveWarehouse != null && warehouseHint ? await resolveWarehouse(warehouseHint) : null;
        const sellerWarehouse = sellerWh?.warehouseCode?.trim() || "";
        lines.push({
          ...line,
          itemCode: mapped.partnerItemCode,
          description: line.description || mapped.description || null,
          uomCode: useSales ? salesCode : line.uomCode,
          uomEntry:
            useSales && sales?.uomEntry != null && sales.uomEntry > 0
              ? sales.uomEntry
              : line.uomEntry,
          // Seller WH from OSCN only — never keep buyer PQ WarehouseCode.
          warehouse: sellerWarehouse || null,
        });
      }
      const rfqNumber = buildRfqNumber(Number(input.sourceDocEntry), input.sourceDocNum);
      logFlowStep(SCOPE, {
        step: 5,
        total: 18,
        title: "Flow 1 create RFQ — inserting IC_RFQ_HEADER/LINE",
        check: "create_rfq_insert",
        detail: {
          lineCount: lines.length,
          lines: lines.map((line) => ({
            description: line.description,
            itemCode: line.itemCode,
            lineNum: line.lineNum,
            // Same tax that lands on product-row PQ Tax (IC_RFQ_LINE.TAX_CODE).
            taxCode: line.taxCode ?? null,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            uomCode: line.uomCode ?? null,
            warehouse: line.warehouse,
          })),
          remarksTag: input.remarksTag,
          rfqNumber,
          sourceCompanyId: input.partner.buyerCompany.companyId,
          sourceDocEntry: input.sourceDocEntry,
          targetCompanyId: input.partner.sellerCompany.companyId,
          vendorCode: input.partner.vendorCode,
        },
      });

      const pqDraftDocEntry = Number(input.sourceDocEntry);
      const pqDraftDocNum = input.sourceDocNum ? Number(input.sourceDocNum) : null;
      // RFQ open: PQ remarks only — buyer company owns PQ (never vendor CardCode).
      const chainRemarks = buildFlow1RfqRemarks({
        buyerCompanyName: input.partner.buyerCompany.companyName,
        sellerCompanyName: input.partner.sellerCompany.companyName,
        existing: input.existingRemarks ?? null,
        pqDraftDocEntry,
        pqDraftDocNum,
        rfqNumber,
      });

      const header = await rfq.createFromDraft({
        createdBy: input.createdBy ?? null,
        lines,
        pqDraftDocEntry,
        pqDraftDocNum,
        remarks: chainRemarks,
        rfqNumber,
        sourceCompanyId: input.partner.buyerCompany.companyId,
        targetCompanyId: input.partner.sellerCompany.companyId,
        vendorCode: input.partner.vendorCode,
      });

      const mapping = await documentMap.create({
        sourceCompanyId: input.partner.buyerCompany.companyId,
        sourceDocEntry: input.sourceDocEntry,
        sourceDocNum: input.sourceDocNum,
        sourceObject: IC_OBJECT.PQ,
        sourceRemarksTag: input.remarksTag,
        status: IC_DOC_MAP_STATUS.SUCCESS,
        targetCompanyId: input.partner.sellerCompany.companyId,
        targetDocEntry: String(header.rfqId),
        targetDocNum: header.rfqNumber,
        targetObject: IC_OBJECT.RFQ,
      });

      logFlowStep(SCOPE, {
        step: 5,
        total: 18,
        title: "Flow 1 create RFQ — insert + map OK",
        check: "create_rfq_ok",
        detail: {
          created: true,
          mappingId: mapping.mappingId,
          remarks: chainRemarks,
          rfqId: header.rfqId,
          rfqLineCount: header.lines?.length ?? lines.length,
          rfqNumber: header.rfqNumber,
          status: header.status,
        },
      });

      return {
        created: true,
        mappingId: mapping.mappingId,
        rfq: header,
      };
    },
  };
};

export const createRfqServiceProcess = createCreateRfqService();
