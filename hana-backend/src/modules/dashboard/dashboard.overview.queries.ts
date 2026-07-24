// Overview Dashboard: open-document KPIs + IC partners + AR OWDD approvals (P1–P3).

import { logger } from "@/core/logger/pino-logger";
import { getCachedData } from "@/core/utils/cache";
import { BusinessPartnerSchema } from "@/db/schemas/business-partner.schema";
import { PurchaseOrderSchema } from "@/db/schemas/purchase-order.schema";
import { PurchaseQuotationSchema } from "@/db/schemas/purchase-quotation.schema";
import { SalesQuotationSchema } from "@/db/schemas/sales-quotation.schema";
import { getTenantRepository } from "@/db/tenant-query";
import {
  loadArApprovalPending,
  type OverviewArApprovalItem,
} from "@/modules/dashboard/dashboard.ar-approval.queries";
import { createBpMappingService } from "@/modules/intercompany/config/bp-mapping/bp-mapping.service";
import type { IcBpMappingWithCompanies } from "@/modules/intercompany/config/bp-mapping/bp-mapping.types";
import { createCompanyService } from "@/modules/intercompany/config/company/company.service";
import { getDisplayCurrency } from "@/services/currency-format";
import { MODULE_HREFS } from "@/services/dashboard/dashboard.constants";

export type { OverviewArApprovalItem };

export type OverviewKpiMetric = {
  count: number;
  openValue: number;
  href: string;
};

/** One IC link from the session company's point of view. */
export type OverviewConnectedPartner = {
  mappingId: number;
  buyerCompanyId: number;
  buyerCompanyName: string | null;
  vendorCompanyId: number;
  vendorCompanyName: string | null;
  vendorCode: string;
  vendorName: string | null;
  buyerCustomerCode: string;
  customerName: string | null;
  /** How this link appears in the session company books. */
  role: "vendor" | "customer";
  /** CardCode in the session company OCRD (vendor or customer). */
  cardCode: string;
  cardName: string | null;
  partnerCompanyId: number;
  partnerCompanyName: string | null;
};

export type OverviewDashboard = {
  currency: string;
  asOf: string;
  sessionCompanyId: number | null;
  kpis: {
    openPq: OverviewKpiMetric;
    openSq: OverviewKpiMetric;
    openPo: OverviewKpiMetric;
    arApprovalPending: { count: number; openValue: number };
  };
  connectedPartners: OverviewConnectedPartner[];
  arApprovalPending: OverviewArApprovalItem[];
  statement: {
    partners: [];
    totals: {
      balance: number;
      aging: { d0_30: number; d31_60: number; d61_90: number; d90_plus: number };
    };
  };
};

const emptyAging = () => ({ d0_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0 });

const toCount = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
};

const toMoney = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
};

async function aggregateOpenDocs(
  dbName: string,
  schema: typeof PurchaseQuotationSchema | typeof SalesQuotationSchema | typeof PurchaseOrderSchema,
  alias: string,
): Promise<{ count: number; openValue: number }> {
  const repo = await getTenantRepository(dbName, schema);
  const stats = await repo
    .createQueryBuilder(alias)
    .select(`SUM(CASE WHEN ${alias}.docStatus = 'O' THEN 1 ELSE 0 END)`, "openCount")
    .addSelect(
      `SUM(CASE WHEN ${alias}.docStatus = 'O' THEN ${alias}.docTotal ELSE 0 END)`,
      "openValue",
    )
    .getRawOne();

  return {
    count: toCount(stats?.openCount),
    openValue: toMoney(stats?.openValue),
  };
}

async function loadBpNamesByCode(
  dbName: string,
  cardCodes: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(cardCodes.map((code) => code.trim()).filter(Boolean))];
  const names = new Map<string, string>();
  if (unique.length === 0) {
    return names;
  }

  try {
    const repo = await getTenantRepository(dbName, BusinessPartnerSchema);
    const rows = await repo
      .createQueryBuilder("bp")
      .select("bp.CardCode", "cardCode")
      .addSelect("bp.CardName", "cardName")
      .where("bp.CardCode IN (:...codes)", { codes: unique })
      .getRawMany<{ cardCode: string; cardName: string }>();

    for (const row of rows) {
      const code = String(row.cardCode ?? "").trim();
      const name = String(row.cardName ?? "").trim();
      if (code && name) {
        names.set(code, name);
      }
    }
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.warn({
      db: dbName,
      err: caughtError,
      msg: "Overview: best-effort OCRD name lookup failed",
    });
  }

  return names;
}

function toConnectedPartner(
  mapping: IcBpMappingWithCompanies,
  sessionCompanyId: number,
  bpNames: Map<string, string>,
): OverviewConnectedPartner {
  const isBuyer = mapping.buyerCompanyId === sessionCompanyId;
  const role: "vendor" | "customer" = isBuyer ? "vendor" : "customer";
  const cardCode = isBuyer ? mapping.vendorCode : mapping.buyerCustomerCode;
  const partnerCompanyId = isBuyer ? mapping.vendorCompanyId : mapping.buyerCompanyId;
  const partnerCompanyName = isBuyer ? mapping.vendorCompanyName : mapping.buyerCompanyName;
  const vendorName = bpNames.get(mapping.vendorCode) ?? null;
  const customerName = bpNames.get(mapping.buyerCustomerCode) ?? null;

  return {
    mappingId: mapping.mappingId,
    buyerCompanyId: mapping.buyerCompanyId,
    buyerCompanyName: mapping.buyerCompanyName,
    vendorCompanyId: mapping.vendorCompanyId,
    vendorCompanyName: mapping.vendorCompanyName,
    vendorCode: mapping.vendorCode,
    vendorName,
    buyerCustomerCode: mapping.buyerCustomerCode,
    customerName,
    role,
    cardCode,
    cardName: bpNames.get(cardCode) ?? null,
    partnerCompanyId,
    partnerCompanyName,
  };
}

async function loadConnectedPartners(
  dbName: string,
): Promise<{ sessionCompanyId: number | null; partners: OverviewConnectedPartner[] }> {
  try {
    const company = createCompanyService();
    const bpMapping = createBpMappingService();
    const sessionCompany = await company.getBySapDbName(dbName);

    if (!sessionCompany) {
      return { sessionCompanyId: null, partners: [] };
    }

    const mappings = await bpMapping.listActiveForCompany(sessionCompany.companyId);
    if (mappings.length === 0) {
      return { sessionCompanyId: sessionCompany.companyId, partners: [] };
    }

    const cardCodes: string[] = [];
    for (const mapping of mappings) {
      if (mapping.buyerCompanyId === sessionCompany.companyId) {
        cardCodes.push(mapping.vendorCode);
      }
      if (mapping.vendorCompanyId === sessionCompany.companyId) {
        cardCodes.push(mapping.buyerCustomerCode);
      }
    }

    const bpNames = await loadBpNamesByCode(dbName, cardCodes);
    const partners = mappings.map((mapping) =>
      toConnectedPartner(mapping, sessionCompany.companyId, bpNames),
    );

    // Stable order: vendors first, then customers; name/code within role.
    partners.sort((left, right) => {
      if (left.role !== right.role) {
        return left.role === "vendor" ? -1 : 1;
      }
      const leftLabel = (left.cardName ?? left.cardCode).toLowerCase();
      const rightLabel = (right.cardName ?? right.cardCode).toLowerCase();
      return leftLabel.localeCompare(rightLabel);
    });

    return { sessionCompanyId: sessionCompany.companyId, partners };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.warn({
      db: dbName,
      err: caughtError,
      msg: "Overview: connected partners load failed; returning empty list",
    });
    return { sessionCompanyId: null, partners: [] };
  }
}

/**
 * Current open PQ / SQ / PO + IC connected partners + AR OWDD approvals.
 * Statement balances remain stubs until P4.
 */
export const getOverviewDashboard = async (dbName: string): Promise<OverviewDashboard> => {
  const cacheKey = `dashboard:overview:${dbName}`;
  const cacheTtlMs = 15_000;

  return getCachedData(
    cacheKey,
    async () => {
      try {
        const currency = await getDisplayCurrency(dbName);
        const [openPq, openSq, openPo, connected, arApproval] = await Promise.all([
          aggregateOpenDocs(dbName, PurchaseQuotationSchema, "pq"),
          aggregateOpenDocs(dbName, SalesQuotationSchema, "sq"),
          aggregateOpenDocs(dbName, PurchaseOrderSchema, "po"),
          loadConnectedPartners(dbName),
          loadArApprovalPending(dbName),
        ]);

        return {
          currency,
          asOf: new Date().toISOString(),
          sessionCompanyId: connected.sessionCompanyId,
          kpis: {
            openPq: {
              count: openPq.count,
              openValue: openPq.openValue,
              href: MODULE_HREFS.purchaseQuotation,
            },
            openSq: {
              count: openSq.count,
              openValue: openSq.openValue,
              href: MODULE_HREFS.salesQuotation,
            },
            openPo: {
              count: openPo.count,
              openValue: openPo.openValue,
              href: MODULE_HREFS.purchaseOrder,
            },
            arApprovalPending: {
              count: arApproval.count,
              openValue: arApproval.openValue,
            },
          },
          connectedPartners: connected.partners,
          arApprovalPending: arApproval.items,
          statement: {
            partners: [],
            totals: { balance: 0, aging: emptyAging() },
          },
        } satisfies OverviewDashboard;
      } catch (err: unknown) {
        const caughtError = err instanceof Error ? err : new Error(String(err));
        logger.error({
          db: dbName,
          err: caughtError,
          msg: "Failed to fetch overview dashboard",
        });
        throw caughtError;
      }
    },
    cacheTtlMs,
  );
};
