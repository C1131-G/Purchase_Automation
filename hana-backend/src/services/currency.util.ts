import { config } from "@/config/env";
import { getTenantRepository } from "@/dal/tenant-dal.helper";
import { AdminSettingsSchema } from "@/db/schemas/admin-settings.schema";

export const getDisplayCurrency = async (dbName: string): Promise<string> => {
  try {
    if (!dbName) {
      return config.currency.defaultCode;
    }
    const repo = await getTenantRepository(dbName, AdminSettingsSchema);
    const settings = await repo.findOne({ select: ["MainCurncy"] });
    const mainCurrency = settings?.MainCurncy?.trim();
    if (mainCurrency && mainCurrency !== "$") {
      return mainCurrency;
    }
  } catch {
    // Ignore and fallback
  }
  return config.currency.defaultCode;
};
