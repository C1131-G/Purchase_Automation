import AppError from "@/core/errors/app-error";

const PORTAL_PREFIX = "Portal_";

export const formatPortalCreatedBy = (username: string): string => {
  const normalized = username.trim();
  if (!normalized) {
    throw new AppError(
      "Please sign in again before creating a document.",
      401,
      "SESSION_REAUTH_REQUIRED",
    );
  }

  if (normalized.toLowerCase().startsWith(PORTAL_PREFIX.toLowerCase())) {
    return `${PORTAL_PREFIX}${normalized.slice(PORTAL_PREFIX.length)}`;
  }

  return `${PORTAL_PREFIX}${normalized}`;
};

export const requirePortalCreatedBy = (session: { portalUsername?: string }): string =>
  formatPortalCreatedBy(session.portalUsername ?? "");
