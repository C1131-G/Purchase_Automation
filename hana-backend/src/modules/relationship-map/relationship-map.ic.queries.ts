import {
  createCompanyService,
  type CompanyService,
} from "@/modules/intercompany/config/company/company.service";
import {
  createDocumentMapQueries,
  type DocumentMapQueries,
} from "@/modules/intercompany/domain/document-map/document-map.queries";
import { parseRfqDisplayNum } from "@/modules/intercompany/domain/document-map/parse-rfq-display-num";
import { createRfqService, type RfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import { IC_OBJECT } from "@/modules/intercompany/infrastructure/object-codes";

import type { NodeResult, RelationshipMapResult } from "./relationship-map.types";

type IcRelationshipMapDeps = {
  company?: Pick<CompanyService, "getBySapDbName">;
  documentMap?: DocumentMapQueries;
  rfq?: Pick<RfqService, "getById">;
};

const resolveDeps = (deps?: IcRelationshipMapDeps) => ({
  company: deps?.company ?? createCompanyService(),
  documentMap: deps?.documentMap ?? createDocumentMapQueries(),
  rfq: deps?.rfq ?? createRfqService(),
});

const emptySalesRelationshipMap = (): RelationshipMapResult => ({
  salesQuotation: [],
  salesOrder: [],
  arInvoice: [],
  arCreditMemo: [],
  incomingPayment: [],
});

const toNodeResult = (
  docEntry: number,
  docNum: number | string | null | undefined,
): NodeResult | null => {
  const entry = Number(docEntry);
  if (!Number.isFinite(entry) || entry <= 0) {
    return null;
  }
  const num = Number(docNum);
  return { docEntry: entry, docNum: Number.isFinite(num) && num > 0 ? num : entry };
};

/**
 * Seller-side IC link: RFQ → SQ only (buyer PQ is not on seller DB).
 * Used by the sales relationship map upstream of Sales Quotation.
 *
 * Tracking: Flow 1 convert writes IC_DOCUMENT_MAPPING (RFQ → SQ) when the
 * auto-generated seller SQ is posted. This resolver reads that row by SQ entry.
 */
export const resolveIcRfqForSalesQuotation = async (
  sapDbName: string,
  sqDocEntry: number,
  deps?: IcRelationshipMapDeps,
): Promise<NodeResult[]> => {
  const { company, documentMap } = resolveDeps(deps);
  const tenant = await company.getBySapDbName(sapDbName);
  if (!tenant?.companyId) {
    return [];
  }

  const map = await documentMap.findByTarget({
    sourceObject: IC_OBJECT.RFQ,
    targetCompanyId: tenant.companyId,
    targetDocEntry: String(sqDocEntry),
    targetObject: IC_OBJECT.SQ,
  });

  if (!map || map.sourceObject !== IC_OBJECT.RFQ) {
    return [];
  }

  const rfqId = Number(map.sourceDocEntry);
  if (!Number.isFinite(rfqId) || rfqId <= 0) {
    return [];
  }

  const docNum = parseRfqDisplayNum(map.sourceDocNum);
  return [{ docEntry: rfqId, docNum: docNum > 0 ? docNum : rfqId }];
};

/**
 * IC seller RFQ map: Request For Quotation → Sales Quotation only.
 *
 * Tracking: after RFQ submit/convert, IC_DOCUMENT_MAPPING links RFQ (source)
 * to the auto-generated seller SQ (target). This powers RFQ hover/detail maps.
 */
export const getIcRfqRelationshipMap = async (
  _sapDbName: string,
  rfqId: number,
  deps?: IcRelationshipMapDeps,
): Promise<RelationshipMapResult> => {
  const { documentMap, rfq } = resolveDeps(deps);
  const result = emptySalesRelationshipMap();
  // Header only — relationship map does not need RFQ lines.
  const header = await rfq.getById(rfqId, false);
  if (!header) {
    return result;
  }

  const rfqDocNum = parseRfqDisplayNum(header.rfqNumber);
  result.requestForQuotation = [{ docEntry: rfqId, docNum: rfqDocNum > 0 ? rfqDocNum : rfqId }];

  const map = await documentMap.findBySource({
    sourceCompanyId: header.sourceCompanyId,
    sourceDocEntry: String(rfqId),
    sourceObject: IC_OBJECT.RFQ,
    targetObject: IC_OBJECT.SQ,
  });

  const sqNode = map ? toNodeResult(Number(map.targetDocEntry), map.targetDocNum) : null;
  if (sqNode) {
    result.salesQuotation = [sqNode];
  }

  return result;
};
