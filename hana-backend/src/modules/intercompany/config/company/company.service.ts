import { createCompanyQueries, type CompanyQueries } from "./company.queries";
import type { IcCompany } from "./company.types";

export type CompanyService = {
  getById: (companyId: number) => Promise<IcCompany | null>;
  getBySapDbName: (sapDbName: string) => Promise<IcCompany | null>;
  listActive: () => Promise<IcCompany[]>;
};

export const createCompanyService = (
  queries: CompanyQueries = createCompanyQueries(),
): CompanyService => ({
  getById: (companyId) => queries.getById(companyId),
  getBySapDbName: (sapDbName) => queries.getBySapDbName(sapDbName),
  listActive: () => queries.listActive(),
});

export const companyService = createCompanyService();
