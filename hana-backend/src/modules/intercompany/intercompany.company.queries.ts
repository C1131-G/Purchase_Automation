import type { Repository } from "typeorm";

import { logger } from "@/core/logger/pino-logger";
import { AppDataSource } from "@/db/config/data-source";
import { OrganizationSchema } from "@/db/schemas/organization.schema";
import type { Organization } from "@/db/schemas/organization.schema";

import type { IntercompanyMappingResolution, IntercompanyOrgRow } from "./intercompany.types";

const LOG_SCOPE = "intercompany.sync";

const ORG_SELECT = [
  "id",
  "companyName",
  "serviceLayerUsername",
  "serviceLayerPassword",
  "vendorCode",
  "customerCode",
] as const;

let organizationRepository: Repository<Organization> | null = null;

const getOrganizationRepository = (): Repository<Organization> => {
  if (!organizationRepository) {
    organizationRepository = AppDataSource.getRepository(OrganizationSchema);
  }
  return organizationRepository;
};

/** Test-only: clear lazy repository cache. */
export const __resetOrganizationRepositoryForTests = (): void => {
  organizationRepository = null;
};

/** Test-only: inject mock repository. */
export const __setOrganizationRepositoryForTests = (
  repository: Repository<Organization> | null,
): void => {
  organizationRepository = repository;
};

const toOrgRow = (org: Organization): IntercompanyOrgRow => ({
  dbName: org.id,
  companyName: org.companyName,
  serviceLayerUsername: org.serviceLayerUsername,
  serviceLayerPassword: org.serviceLayerPassword,
  vendorCode: org.vendorCode,
  customerCode: org.customerCode,
});

export const getOrganizationByDbName = async (
  dbName: string,
): Promise<IntercompanyOrgRow | null> => {
  const organization = await getOrganizationRepository().findOne({
    select: [...ORG_SELECT],
    where: { id: dbName },
  });
  return organization ? toOrgRow(organization) : null;
};

export const getOtherOrganizations = async (sourceDb: string): Promise<IntercompanyOrgRow[]> => {
  const organizations = await getOrganizationRepository().find({
    select: [...ORG_SELECT],
  });
  return organizations.map(toOrgRow).filter((org) => org.dbName !== sourceDb);
};

const pickTargetOrganization = (
  otherOrgs: IntercompanyOrgRow[],
  sourceDb: string,
): IntercompanyOrgRow | null => {
  if (otherOrgs.length === 0) {
    return null;
  }

  let targetOrg = otherOrgs[0];
  if (otherOrgs.length > 1) {
    targetOrg =
      otherOrgs.find(
        (org) =>
          Boolean(org.customerCode?.trim()) &&
          Boolean(org.serviceLayerUsername?.trim()) &&
          Boolean(org.serviceLayerPassword),
      ) ?? otherOrgs[0];
    logger.warn({
      scope: LOG_SCOPE,
      step: "mapping_load_target_other_company",
      outcome: "ambiguous",
      sourceDb,
      candidateDbs: otherOrgs.map((org) => org.dbName),
      selectedTargetDb: targetOrg.dbName,
      msg: "Multiple other companies in VST_COMMON; Phase 1 selected one target",
    });
  }

  if (targetOrg.dbName === sourceDb) {
    logger.warn({
      scope: LOG_SCOPE,
      step: "mapping_self_check",
      outcome: "failure",
      sourceDb,
      targetDb: targetOrg.dbName,
      msg: "Intercompany mapping rejected: target company is the same as source",
    });
    return null;
  }

  return targetOrg;
};

/**
 * Resolve PO vendor → partner company + target AR draft customer.
 * Trigger: source VENDOR_CODE === PO CardCode. Target: other VST_COMMON company.
 */
export const resolvePoToArInvoiceMapping = async (params: {
  sourceDb: string;
  sourceVendorCode: string;
}): Promise<IntercompanyMappingResolution | null> => {
  const sourceDb = params.sourceDb.trim();
  const sourceVendorCode = params.sourceVendorCode.trim();

  logger.info({
    scope: LOG_SCOPE,
    step: "mapping_load_source",
    sourceDb,
    sourceVendorCode,
    msg: "Loading source organization from VST_COMMON",
  });

  if (!sourceDb || !sourceVendorCode) {
    return null;
  }

  const sourceOrg = await getOrganizationByDbName(sourceDb);
  if (!sourceOrg) {
    logger.warn({
      scope: LOG_SCOPE,
      step: "mapping_load_source",
      outcome: "failure",
      sourceDb,
      msg: "Source organization not found in VST_COMMON",
    });
    return null;
  }

  const sourceVendorOnRow = sourceOrg.vendorCode?.trim() ?? "";
  logger.info({
    scope: LOG_SCOPE,
    step: "mapping_load_source",
    outcome: "success",
    sourceDb,
    sourceVendorCodeOnRow: sourceVendorOnRow || null,
    msg: "Source organization loaded",
  });

  if (!sourceVendorOnRow || sourceVendorOnRow !== sourceVendorCode) {
    logger.info({
      scope: LOG_SCOPE,
      step: "mapping_source_vendor_match",
      outcome: "skipped",
      sourceDb,
      sourceVendorCode,
      sourceVendorCodeOnRow: sourceVendorOnRow || null,
      msg: "PO vendor is not the source company intercompany vendor",
    });
    return null;
  }

  logger.info({
    scope: LOG_SCOPE,
    step: "mapping_source_vendor_match",
    outcome: "success",
    sourceDb,
    sourceVendorCode,
    msg: "PO CardCode matches source organization VENDOR_CODE",
  });

  const otherOrgs = await getOtherOrganizations(sourceDb);
  const targetOrg = pickTargetOrganization(otherOrgs, sourceDb);
  if (!targetOrg) {
    logger.info({
      scope: LOG_SCOPE,
      step: "mapping_load_target_other_company",
      outcome: "skipped",
      sourceDb,
      msg: "No other organization found to use as intercompany target",
    });
    return null;
  }

  const targetCustomerCode = targetOrg.customerCode?.trim() ?? "";
  const targetServiceLayerUsername = targetOrg.serviceLayerUsername?.trim() ?? "";
  const targetServiceLayerPassword = targetOrg.serviceLayerPassword ?? "";

  logger.info({
    scope: LOG_SCOPE,
    step: "mapping_load_target_other_company",
    outcome: "success",
    sourceDb,
    targetDb: targetOrg.dbName,
    targetCustomerCode: targetCustomerCode || null,
    msg: "Target organization resolved as other company",
  });

  if (!targetCustomerCode) {
    logger.warn({
      scope: LOG_SCOPE,
      step: "mapping_target_customer",
      outcome: "failure",
      targetDb: targetOrg.dbName,
      msg: "Target organization has no CUSTOMER_CODE",
    });
    return null;
  }

  if (!targetServiceLayerUsername || !targetServiceLayerPassword) {
    logger.warn({
      scope: LOG_SCOPE,
      step: "mapping_target_credentials",
      outcome: "failure",
      targetDb: targetOrg.dbName,
      msg: "Target organization missing Service Layer credentials",
    });
    return null;
  }

  logger.info({
    scope: LOG_SCOPE,
    step: "mapping_resolved",
    outcome: "success",
    sourceDb,
    sourceVendorCode,
    targetDb: targetOrg.dbName,
    targetCustomerCode,
    msg: "Intercompany mapping fully resolved",
  });

  return {
    sourceDb,
    sourceVendorCode,
    targetDb: targetOrg.dbName,
    targetCustomerCode,
    targetServiceLayerUsername,
    targetServiceLayerPassword,
  };
};
