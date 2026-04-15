// Credential Service: Specialized logic for retrieving Service Layer authentication details (User, Pass) for a specific tenant from the master organization table.

import type { Repository } from "typeorm";

import { logger } from "@/core/logger/pino-logger";
import { getCachedData } from "@/core/utils/cache";
import { AppDataSource } from "@/db/config/data-source";
import { type Organization, OrganizationSchema } from "@/db/schemas/organization.schema";

// Singleton-style cache for the TypeORM repository to avoid repeated initialization overhead.
let organizationRepository: Repository<Organization> | null = null;

// Lazily initializes and returns the TypeORM repository for Organizations.
const getOrganizationRepository = (): Repository<Organization> => {
  if (!organizationRepository) {
    organizationRepository = AppDataSource.getRepository(OrganizationSchema);
  }
  return organizationRepository;
};

export interface ServiceLayerCredentials {
  dbName: string;
  companyName: string;
  dbServer: string;
  serviceLayerUsername?: string;
  serviceLayerPassword?: string;
}

// Retrieves the Service Layer credentials (Username/Password) from the central configuration database.
export const getServiceLayerCredentials = async (
  dbName: string,
): Promise<ServiceLayerCredentials | null> => {
  const cacheKey = `creds:${dbName}`;

  // Uses a 1-hour cache TTL as organization credentials change extremely rarely.
  return getCachedData(
    cacheKey,
    async () => {
      try {
        const repository = getOrganizationRepository();

        // Optimized SELECT: Only retrieves sensitive credentials and basic server info.
        const organization = await repository.findOne({
          where: { id: dbName },
          select: ["id", "companyName", "dbServer", "serviceLayerUsername", "serviceLayerPassword"],
        });

        if (!organization) {
          return null;
        }

        logger.info({ msg: "SL Credentials fetched (Fresh)", dbName });

        return {
          dbName: organization.id,
          companyName: organization.companyName,
          dbServer: organization.dbServer,
          serviceLayerUsername: organization.serviceLayerUsername,
          serviceLayerPassword: organization.serviceLayerPassword,
        };
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error({
          msg: "Failed to fetch Service Layer credentials",
          error: error.message,
          dbName,
        });
        throw error;
      }
    },
    1000 * 60 * 60,
  );
};

export const credentialService = {
  getServiceLayerCredentials,
};
