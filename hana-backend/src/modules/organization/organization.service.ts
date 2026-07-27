// Organization Service: Manages the discovery of tenant databases. Acts as a bridge between the core app and the central 'SBO-COMMON' style registry.

import type { Repository } from "typeorm";

import { logger } from "@/core/logger/pino-logger";
import { getCachedData, setCachedData } from "@/core/utils/cache";
import { AppDataSource } from "@/db/config/data-source";
import { OrganizationSchema } from "@/db/schemas/organization.schema";
import type { Organization } from "@/db/schemas/organization.schema";

export interface DatabaseItem {
  dbName: string;
  companyName: string;
  dbServer: string;
  isActive: string;
}

// Singleton-style cache for the TypeORM repository to avoid repeated initialization overhead.
let organizationRepository: Repository<Organization> | null = null;

// Lazily initializes and returns the TypeORM repository for Organizations.
const getOrganizationRepository = (): Repository<Organization> => {
  if (!organizationRepository) {
    organizationRepository = AppDataSource.getRepository(OrganizationSchema);
  }
  if (!organizationRepository) {
    throw new Error("Repository not initialized");
  }
  return organizationRepository;
};

// Returns a list of all databases (tenants) configured in the master registry.
export const getAvailableDatabases = async (): Promise<DatabaseItem[]> =>
  getCachedData<DatabaseItem[]>(
    "all_databases",
    async () => {
      try {
        const repository = getOrganizationRepository();

        // Pull display fields + SL credentials in one scan so the login form warm-up
        // also primes `creds:{dbName}` and avoids a second org row read on Sign In.
        const results = await repository.find({
          order: {
            companyName: "ASC",
          },
          select: ["id", "companyName", "dbServer", "serviceLayerUsername", "serviceLayerPassword"],
        });

        const databases = results.map((data) => {
          // Seed credential cache for each tenant from this single scan (login skip-read).
          setCachedData(
            `creds:${data.id}`,
            {
              companyName: data.companyName,
              dbName: data.id,
              dbServer: data.dbServer,
              serviceLayerPassword: data.serviceLayerPassword,
              serviceLayerUsername: data.serviceLayerUsername,
            },
            1000 * 60 * 60,
          );

          return {
            dbName: data.id,
            companyName: data.companyName,
            dbServer: data.dbServer,
            // Defaults to Active for now; SAP-side suspension logic could be added here.
            isActive: "Y",
          };
        });

        logger.info({
          count: databases.length,
          msg: "Databases fetched (Fresh)",
        });

        return databases;
      } catch (err: unknown) {
        const caughtError = err instanceof Error ? err : new Error(String(err));
        logger.error({
          err: caughtError,
          msg: "Failed to fetch organizations from HANA",
        });
        const dbError = new Error(
          `Failed to retrieve organizations: ${caughtError.message}`,
        ) as Error & {
          statusCode?: number;
        };
        dbError.statusCode = 500;

        throw dbError;
      }
    },
    1000 * 60 * 60,
  );

// Returns a single database by its id (dbName). Cached — org rows rarely change.
export const getDatabaseById = async (id: string): Promise<DatabaseItem | null> =>
  getCachedData(
    `org:by-id:${id}`,
    async () => {
      const repository = getOrganizationRepository();
      const result = await repository.findOne({
        where: { id },
        select: ["id", "companyName", "dbServer"],
      });
      if (!result) {
        return null;
      }
      return {
        dbName: result.id,
        companyName: result.companyName,
        dbServer: result.dbServer,
        isActive: "Y",
      };
    },
    1000 * 60 * 60,
  );

export const organizationService = {
  getAvailableDatabases,
  getDatabaseById,
};
