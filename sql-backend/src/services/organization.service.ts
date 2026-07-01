// Organization Service: Returns company info for the login page.
// Mirrors hana-backend's organization service but single-tenant (no SAP tenant registry).

import { getCachedData } from "@/core/utils/cache";

interface DatabaseItem {
  dbName: string;
  companyName: string;
  dbServer: string;
  isActive: string;
}

const dummyOrg: DatabaseItem = {
  dbName: "ERP",
  companyName: "VedhaSoft ERP",
  dbServer: "localhost",
  isActive: "Y",
};

export const getAvailableDatabases = async (): Promise<DatabaseItem[]> => {
  return getCachedData(
    "all_databases",
    async () => {
      // For single-tenant SQL, return a hardcoded org.
      // Future: read from a config table if multi-tenant is needed.
      return [dummyOrg];
    },
    60 * 60 * 1000,
  ); // 1 hour cache
};

export const organizationService = { getAvailableDatabases };
