// Converts camelCase Drizzle rows to PascalCase SAP-style format the frontend expects.

import {
  DOC_FIELD_MAP,
  DOC_STATUS_FIELDS,
  ITEM_FIELD_MAP,
  KEEP_CAMELCASE,
  LINE_FIELD_MAP,
  NUMERIC_FIELDS,
  STATUS_MAP,
  type StatusMap,
} from "./sap-response-field-maps";

export type { StatusMap };

const statusToLabel = (value: string | undefined | null): string => {
  if (!value) return "Open";
  return STATUS_MAP[value] ?? value;
};

const parseNumber = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const transformLineItem = (line: Record<string, unknown>): Record<string, unknown> => {
  if (!line || typeof line !== "object") return line;

  const output: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(line)) {
    if (key in LINE_FIELD_MAP) {
      const mapped = LINE_FIELD_MAP[key];
      if (mapped && mapped.length > 0) {
        if (mapped === "DocStatus" || mapped === "LineStatus") {
          output[mapped] = statusToLabel(String(value));
        } else if (NUMERIC_FIELDS.has(mapped)) {
          output[mapped] = parseNumber(value);
        } else {
          output[mapped] = value;
        }
      }
      continue;
    }
    output[key] = value;
  }

  if ("UnitPrice" in output && !("Price" in output)) {
    output.Price = output.UnitPrice;
  } else if ("Price" in output && !("UnitPrice" in output)) {
    output.UnitPrice = output.Price;
  }

  return output;
};

const transformRow = (row: Record<string, unknown>): Record<string, unknown> => {
  if (!row || typeof row !== "object") return row;

  const output: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    if ((key === "lines" || key === "DocumentLines") && Array.isArray(value)) {
      output.DocumentLines = value.map((line: Record<string, unknown>) => transformLineItem(line));
      continue;
    }

    if ((key === "attachments" || key === "Attachments") && Array.isArray(value)) {
      output.Attachments = value.map((attachment: Record<string, unknown>) => ({
        fileName: attachment.fileName,
        fileExtension: attachment.fileExtension,
        sourcePath: attachment.sourcePath,
        attachmentDate: attachment.attachmentDate,
        freeText: attachment.freeText || "",
      }));
      continue;
    }

    if (key in ITEM_FIELD_MAP) {
      const mapped = ITEM_FIELD_MAP[key];
      if (mapped && mapped.length > 0) {
        if (mapped === "frozenFor") {
          output[mapped] = value === true || value === 1 || value === "Y" ? "Y" : "N";
        } else {
          output[mapped] = value;
        }
      }
      continue;
    }

    if (key in DOC_FIELD_MAP) {
      const mapped = DOC_FIELD_MAP[key];
      if (mapped && mapped.length > 0) {
        if (DOC_STATUS_FIELDS.has(mapped)) {
          output[mapped] = statusToLabel(String(value));
        } else if (NUMERIC_FIELDS.has(mapped) && !KEEP_CAMELCASE.has(mapped)) {
          output[mapped] = parseNumber(value);
        } else {
          output[mapped] = value;
        }
      }
      continue;
    }

    output[key] = value;
  }

  if ("DocTotal" in output && typeof output.DocTotal === "string") {
    output.DocTotal = parseNumber(output.DocTotal);
  }
  if ("id" in output) {
    output.id = parseNumber(output.id);
  }
  // SQL nullables → empty string so response matches HANA string fields.
  if ("CardName" in output && output.CardName === null) {
    output.CardName = "";
  }
  if ("DocCurr" in output && output.DocCurr === null) {
    output.DocCurr = "";
  }

  if ("DocTotal" in output && "paidToDate" in output) {
    const total = Number(output.DocTotal ?? 0);
    const paid = Number(output.paidToDate ?? 0);
    output.BalanceDue = Math.round((total - paid) * 100) / 100;
  }

  return output;
};

export const toPascalCase = (row: Record<string, unknown>): Record<string, unknown> => {
  return transformRow(row);
};

export const toPascalCaseList = (page: {
  data: Record<string, unknown>[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}): {
  data: Record<string, unknown>[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
} => ({
  data: (page.data || []).map((row) => transformRow(row)),
  total: page.total ?? 0,
  page: page.page ?? 1,
  limit: page.limit ?? 20,
  totalPages: page.totalPages ?? 1,
});

export const toPascalCaseDocnums = (rows: unknown[]): { code: string; name: string }[] => {
  if (!Array.isArray(rows)) return [];
  return rows.map((entry: unknown) => {
    if (typeof entry === "object" && entry !== null) {
      const row = entry as Record<string, unknown>;
      const code = String(row.docNum ?? row.code ?? "");
      const name = String(row.name ?? row.code ?? row.docNum ?? "");
      return { code, name };
    }
    const text = String(entry);
    return { code: text, name: text };
  });
};
