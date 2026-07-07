import { config } from "@/config/env";

export const getDisplayCurrency = async (): Promise<string> => {
  return config.currency.defaultCode;
};
