import { getDb } from "@/db/client";

import { organizationRepository } from "./organization.repository";

interface DatabaseItem {
  dbName: string;
  companyName: string;
  dbServer: string;
  isActive: string;
}

export const getAvailableDatabases = async (username?: string): Promise<DatabaseItem[]> => {
  const db = getDb();

  if (!username) {
    return [];
  }

  const results = await organizationRepository.findAvailableDatabases(db, username);
  return results;
};

export const organizationService = { getAvailableDatabases };
