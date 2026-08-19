import { describe, expect, it } from "vitest";

import { hashPortalPassword } from "@/modules/auth/portal-password-hash";
import {
  isBcryptHash,
  PORTAL_PASSWORD_SALT_ROUNDS,
  verifyPortalPassword,
} from "@/modules/auth/portal-password";

describe("isBcryptHash", () => {
  it("accepts a standard bcrypt hash", () => {
    const hash = "$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZabcde";

    expect(isBcryptHash(hash)).toBe(true);
  });

  it("rejects plaintext", () => {
    expect(isBcryptHash("Secret123")).toBe(false);
  });
});

describe("hashPortalPassword", () => {
  it("uses cost 10", async () => {
    const hashed = await hashPortalPassword("Secret123");

    expect(hashed.startsWith(`$2b$${String(PORTAL_PASSWORD_SALT_ROUNDS).padStart(2, "0")}$`)).toBe(
      true,
    );
    expect(isBcryptHash(hashed)).toBe(true);
  });
});

describe("verifyPortalPassword", () => {
  it("accepts leftover plaintext that matches", async () => {
    await expect(verifyPortalPassword("Secret123", "Secret123")).resolves.toBe(true);
  });

  it("rejects leftover plaintext that does not match", async () => {
    await expect(verifyPortalPassword("Secret123", "wrong")).resolves.toBe(false);
  });

  it("accepts the plaintext for a stored bcrypt hash", async () => {
    const hashed = await hashPortalPassword("Secret123");

    await expect(verifyPortalPassword(hashed, "Secret123")).resolves.toBe(true);
  });

  it("rejects the wrong plaintext against a stored bcrypt hash", async () => {
    const hashed = await hashPortalPassword("Secret123");

    await expect(verifyPortalPassword(hashed, "wrong")).resolves.toBe(false);
  });

  it("rejects empty stored or empty candidate", async () => {
    await expect(verifyPortalPassword("", "Secret123")).resolves.toBe(false);
    await expect(verifyPortalPassword("Secret123", "")).resolves.toBe(false);
    await expect(verifyPortalPassword(null, "Secret123")).resolves.toBe(false);
  });
});
