// Portal U_PortalPassword: bcrypt hashes (cost from env) or leftover plaintext.
import { timingSafeEqual } from "node:crypto";

import { compare } from "bcryptjs";

import { config } from "@/config/env";

export const PORTAL_PASSWORD_SALT_ROUNDS = config.auth.portalPasswordSaltRounds;

const BCRYPT_HASH = /^\$2[abxy]\$\d{2}\$[./A-Za-z0-9]{53}$/;

export const isBcryptHash = (value: string): boolean => BCRYPT_HASH.test(value.trim());

const plainEquals = (stored: string, candidate: string): boolean => {
  const storedBytes = Buffer.from(stored, "utf8");
  const candidateBytes = Buffer.from(candidate, "utf8");
  if (storedBytes.length !== candidateBytes.length) {
    return false;
  }
  return timingSafeEqual(storedBytes, candidateBytes);
};

export const verifyPortalPassword = async (
  stored: string | undefined | null,
  candidate: string,
): Promise<boolean> => {
  if (stored == null || candidate.length === 0) {
    return false;
  }

  const trimmed = stored.trim();
  if (trimmed.length === 0) {
    return false;
  }

  if (isBcryptHash(trimmed)) {
    return compare(candidate, trimmed);
  }

  return plainEquals(trimmed, candidate);
};
