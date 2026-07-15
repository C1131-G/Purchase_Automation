import { getDb } from "@/db/client";

import { bankDetailsRepository } from "./bank-details.repository";

export const getList = () => {
  const db = getDb();
  return bankDetailsRepository.findList(db);
};

export const getByCountry = async (countryCode: string) => {
  const db = getDb();
  return bankDetailsRepository.findByCountry(db, countryCode);
};

export const bankDetailService = { getByCountry, getList };
