// Cookie Utilities: Specialized helpers for extracting and manipulating HTTP cookies returned by SAP B1.

export const extractSessionId = (cookies: string[]): string | null => {
  if (!cookies || !Array.isArray(cookies)) {
    return null;
  }

  for (const cookie of cookies) {
    const match = cookie.match(/B1SESSION=([^;]+)/);
    if (match) {
      return match[1];
    }
  }

  return null;
};
