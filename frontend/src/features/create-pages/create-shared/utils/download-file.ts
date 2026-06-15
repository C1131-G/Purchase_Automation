/** Downloads a file from the API with credentials and triggers browser download. */

const BASE_URL: string = import.meta.env.VITE_API_URL || "http://localhost:4000";

export async function downloadFile(relativeUrl: string, filename: string): Promise<void> {
  const response = await fetch(`${BASE_URL}${relativeUrl}`, {
    credentials: "include",
  });

  if (!response.ok) {
    let details = `${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      if (body?.message) details += ` — ${body.message}`;
    } catch {}
    throw new Error(`Download failed: ${details}`);
  }

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);
}
