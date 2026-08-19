// Hash-only helper so login (verify) does not pull bcrypt.hash into the server bundle.
import { hash } from "bcryptjs";

import { PORTAL_PASSWORD_SALT_ROUNDS } from "./portal-password";

export const hashPortalPassword = async (plain: string): Promise<string> => {
  return hash(plain, PORTAL_PASSWORD_SALT_ROUNDS);
};
