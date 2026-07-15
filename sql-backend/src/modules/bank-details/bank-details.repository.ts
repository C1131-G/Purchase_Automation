import { eq } from "drizzle-orm";

import { bankDetails } from "@/db/schema/bank-details";
import type { LooseDb } from "@/types/db.types";

export const bankDetailsRepository = {
  async findList(db: LooseDb) {
    return db.select().from(bankDetails);
  },

  async findByCountry(db: LooseDb, countryCode: string) {
    const [row] = await db
      .select()
      .from(bankDetails)
      .where(eq(bankDetails.countryCode, countryCode))
      .limit(1);
    return row || null;
  },
};
