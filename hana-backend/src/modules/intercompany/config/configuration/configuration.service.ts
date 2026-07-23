import { IC_CONFIG_KEY } from "@/modules/intercompany/infrastructure/constants";

import { createConfigurationQueries, type ConfigurationQueries } from "./configuration.queries";

const truthy = (raw: string | null | undefined): boolean => {
  if (!raw) {
    return false;
  }
  const normalized = raw.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
};

export type ConfigurationService = {
  getFlag: (key: string) => Promise<boolean>;
  getNumber: (key: string, fallback?: number) => Promise<number>;
  getString: (key: string, fallback?: string) => Promise<string>;
  isFlow1Enabled: () => Promise<boolean>;
  isFlow2Enabled: () => Promise<boolean>;
};

export const createConfigurationService = (
  queries: ConfigurationQueries = createConfigurationQueries(),
): ConfigurationService => {
  const getRaw = async (key: string): Promise<string | null> => {
    const row = await queries.getByKey(key);
    return row?.configValue ?? null;
  };

  return {
    getFlag: async (key) => truthy(await getRaw(key)),

    getNumber: async (key, fallback = 0) => {
      const raw = await getRaw(key);
      if (raw === null) {
        return fallback;
      }
      const num = Number(raw);
      return Number.isFinite(num) ? num : fallback;
    },

    getString: async (key, fallback = "") => {
      const raw = await getRaw(key);
      return raw ?? fallback;
    },

    isFlow1Enabled: async () => truthy(await getRaw(IC_CONFIG_KEY.ENABLE_FLOW1_RFQ_CHAIN)),

    isFlow2Enabled: async () => truthy(await getRaw(IC_CONFIG_KEY.ENABLE_FLOW2_DIRECT_PO)),
  };
};

export const configurationService = createConfigurationService();
