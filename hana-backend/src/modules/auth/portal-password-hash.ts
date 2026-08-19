// Hash-only helper so login (verify) does not pull bcrypt.hash into the server bundle.
import { hash } from "bcryptjs";

import { config } from "@/config/env";

export const hashPortalPassword = async (plain: string): Promise<string> => {
  return hash(plain, config.auth.portalPasswordSaltRounds);
};
