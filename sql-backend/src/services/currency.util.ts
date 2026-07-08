import { eq } from "drizzle-orm";
import { config } from "@/config/env";
import { getDb } from "@/db/client";
import { adminSettings } from "@/db/schema/admin-settings";

export const getDisplayCurrency = async (): Promise<string> => {
  try {
    const db = getDb();
    const [row] = await db
      .select({ value: adminSettings.value })
      .from(adminSettings)
      .where(eq(adminSettings.code, "MainCurncy"))
      .limit(1);
    const mainCurrency = row?.value?.trim();
    if (mainCurrency && mainCurrency !== "$") {
      return mainCurrency;
    }
  } catch {
    // Ignore and fall back to env
  }
  return config.currency.defaultCode;
};
