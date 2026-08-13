// Dashboard relationship section: IC mappings, partner names, and statement data.

import { logger } from "@/core/logger/pino-logger";
import { getCachedData } from "@/core/utils/cache";
import { BusinessPartnerSchema } from "@/db/schemas/business-partner.schema";
import { getTenantRepository } from "@/db/tenant-query";
import {
  emptyAging,
  loadStatement,
  type OverviewStatement,
  type StatementPartnerInput,
} from "@/modules/dashboard/dashboard.statement.queries";
import { createBpMappingService } from "@/modules/intercompany/config/bp-mapping/bp-mapping.service";
import type { IcBpMappingWithCompanies } from "@/modules/intercompany/config/bp-mapping/bp-mapping.types";
import { createCompanyService } from "@/modules/intercompany/config/company/company.service";

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
  role: "vendor" | "customer";
  cardCode: string;
  cardName: string | null;
  partnerCompanyId: number;
  partnerCompanyName: string | null;
};

export type OverviewRelationships = {
  asOf: string;
  sessionCompanyId: number | null;
  connectedPartners: OverviewConnectedPartner[];
  statement: OverviewStatement;
};

async function loadBpNamesByCode(
  dbName: string,
  cardCodes: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(cardCodes.map((code) => code.trim()).filter(Boolean))];
  const names = new Map<string, string>();
  if (unique.length === 0) return names;

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
      if (code && name) names.set(code, name);
    }
  } catch (error: unknown) {
    logger.warn({
      db: dbName,
      err: error instanceof Error ? error : new Error(String(error)),
      msg: "Overview: best-effort OCRD name lookup failed",
    });
  }
  return names;
}

function toPartnerInput(
  mapping: IcBpMappingWithCompanies,
  sessionCompanyId: number,
): StatementPartnerInput | null {
  if (mapping.buyerCompanyId === sessionCompanyId) {
    return { cardCode: mapping.vendorCode, cardName: null, role: "vendor" };
  }
  if (mapping.vendorCompanyId === sessionCompanyId) {
    return { cardCode: mapping.buyerCustomerCode, cardName: null, role: "customer" };
  }
  return null;
}

function toConnectedPartner(
  mapping: IcBpMappingWithCompanies,
  sessionCompanyId: number,
  bpNames: Map<string, string>,
): OverviewConnectedPartner {
  const isBuyer = mapping.buyerCompanyId === sessionCompanyId;
  const role = isBuyer ? "vendor" : "customer";
  const cardCode = isBuyer ? mapping.vendorCode : mapping.buyerCustomerCode;
  return {
    ...mapping,
    vendorName: bpNames.get(mapping.vendorCode) ?? null,
    customerName: bpNames.get(mapping.buyerCustomerCode) ?? null,
    role,
    cardCode,
    cardName: bpNames.get(cardCode) ?? null,
    partnerCompanyId: isBuyer ? mapping.vendorCompanyId : mapping.buyerCompanyId,
    partnerCompanyName: isBuyer ? mapping.vendorCompanyName : mapping.buyerCompanyName,
  };
}

export const getOverviewRelationships = async (dbName: string): Promise<OverviewRelationships> =>
  getCachedData(
    `dashboard:overview:${dbName}:relationships`,
    async () => {
      try {
        const sessionCompany = await createCompanyService().getBySapDbName(dbName);
        if (!sessionCompany) {
          return {
            asOf: new Date().toISOString(),
            sessionCompanyId: null,
            connectedPartners: [],
            statement: { partners: [], totals: { balance: 0, aging: emptyAging() } },
          };
        }

        const mappings = await createBpMappingService().listActiveForCompany(
          sessionCompany.companyId,
        );
        const inputs = mappings
          .map((mapping) => toPartnerInput(mapping, sessionCompany.companyId))
          .filter((input): input is StatementPartnerInput => input !== null);

        const [bpNames, statement] = await Promise.all([
          loadBpNamesByCode(
            dbName,
            inputs.map((input) => input.cardCode),
          ),
          loadStatement(dbName, inputs),
        ]);
        const connectedPartners = mappings.map((mapping) =>
          toConnectedPartner(mapping, sessionCompany.companyId, bpNames),
        );
        connectedPartners.sort((left, right) => {
          if (left.role !== right.role) return left.role === "vendor" ? -1 : 1;
          return (left.cardName ?? left.cardCode)
            .toLowerCase()
            .localeCompare((right.cardName ?? right.cardCode).toLowerCase());
        });

        return {
          asOf: new Date().toISOString(),
          sessionCompanyId: sessionCompany.companyId,
          connectedPartners,
          statement,
        } satisfies OverviewRelationships;
      } catch (error: unknown) {
        logger.warn({
          db: dbName,
          err: error instanceof Error ? error : new Error(String(error)),
          msg: "Overview: connected partners load failed; returning empty relationship data",
        });
        return {
          asOf: new Date().toISOString(),
          sessionCompanyId: null,
          connectedPartners: [],
          statement: { partners: [], totals: { balance: 0, aging: emptyAging() } },
        };
      }
    },
    60_000,
  );
