const SENSITIVE_ERROR_PATTERNS = [
  /sql/i,
  /hana/i,
  /stack trace/i,
  /exception/i,
  /sequelize/i,
  /odbc/i,
  /select\s+.+\s+from/i,
  /insert\s+into/i,
  /update\s+.+\s+set/i,
  /delete\s+from/i,
]

/**
 * Converts unknown/raw backend errors into user-safe UI copy.
 * Keeps friendly messages while suppressing technical/internal details.
 */
export function toSafeErrorMessage(
  message: string | undefined,
  fallback = 'Something went wrong. Please try again.',
): string {
  const trimmed = message?.trim()
  if (!trimmed) return fallback

  const hasSensitiveDetails = SENSITIVE_ERROR_PATTERNS.some((pattern) => pattern.test(trimmed))
  if (hasSensitiveDetails) return fallback

  if (trimmed.length > 180) {
    return `${trimmed.slice(0, 177)}...`
  }

  return trimmed
}
