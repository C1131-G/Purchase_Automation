import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { bankDetails } from "@/db/schema/bank-details";

export const getList = async () => {
  const db = getDb();
  return db.select().from(bankDetails);
};

export const getByCountry = async (countryCode: string) => {
  const db = getDb();
  const [row] = await db
    .select()
    .from(bankDetails)
    .where(eq(bankDetails.countryCode, countryCode))
    .limit(1);
  return row ?? null;
};

export const bankDetailService = { getByCountry, getList };
