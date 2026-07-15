import path from "node:path";
export function sanitizeFilename(fileName: string): string {
  // Remove invalid characters, keeping alphanumeric, dots, hyphens, and underscores
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);
  const sanitizedBase = base.replace(/[^a-zA-Z0-9.-]/g, "_");
  return sanitizedBase;
}

/**
 * Formats a date/time into DD_MM_YYYY_hh_mm_ss_AM/PM string format.
 */

export function formatDateTimeAMPM(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";

  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = String(hours).padStart(2, "0");

  return `${day}_${month}_${year}_${strHours}_${minutes}_${seconds}_${ampm}`;
}

/**
 * Saves uploaded files to disk under the configured folder structure:
 * <base>\<DB_NAME>\<MODULE_NAME>\<YYYY-MM-DD>\
 */
