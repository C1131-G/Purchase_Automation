// Cookie Utilities: Specialized helpers for extracting and manipulating HTTP cookies returned by SAP B1.

// extractSessionId: Parses 'Set-Cookie' headers to retrieve the primary B1SESSION identifier.
export const extractSessionId = (cookies: string[]): string | null => {
  if (!cookies || !Array.isArray(cookies)) {
    return null;
  }

  // Regex matches the value assigned to 'B1SESSION=', stopping at the first semicolon or end of string.
  for (const cookie of cookies) {
    const match = cookie.match(/B1SESSION=([^;]+)/);
    if (match) {
      return match[1];
    }
  }

  return null;
};
