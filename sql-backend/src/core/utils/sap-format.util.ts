import {
  STATUS_MAP,
  DOC_FIELD_MAP,
  LINE_FIELD_MAP,
  ITEM_FIELD_MAP,
  NUMERIC_FIELDS,
  DOC_STATUS_FIELDS,
  KEEP_CAMELCASE,
} from "./sap-field-maps";

const statusToLabel = (rawStatus: string | undefined | null): string => {
  if (!rawStatus) {
    return "Open";
  }
  return STATUS_MAP[rawStatus] ?? rawStatus;
};

const parseNumber = (rawValue: unknown): number => {
  if (typeof rawValue === "number") {
    return rawValue;
  }
  if (typeof rawValue === "string" && rawValue.trim() !== "") {
    const parsedNumber = Number(rawValue);
    return Number.isNaN(parsedNumber) ? 0 : parsedNumber;
  }
  return 0;
};

const transformRow = (row: Record<string, unknown>): Record<string, unknown> => {
  if (!row || typeof row !== "object") {
    return row;
  }

  const output: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    // Lines array → transform each line (must be processed before DOC_FIELD_MAP check)
    if ((key === "lines" || key === "DocumentLines") && Array.isArray(value)) {
      output.DocumentLines = value.map((line: Record<string, unknown>) => transformLineItem(line));
      continue;
    }

    // Attachments array → format camelCase structure directly
    if ((key === "attachments" || key === "Attachments") && Array.isArray(value)) {
      output.Attachments = value.map((attachment: Record<string, unknown>) => ({
        attachmentDate: attachment.attachmentDate,
        fileExtension: attachment.fileExtension,
        fileName: attachment.fileName,
        freeText: attachment.freeText || "",
        sourcePath: attachment.sourcePath,
      }));
      continue;
    }

    // Item master special handling
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

    // Document field handling
    if (key in DOC_FIELD_MAP) {
      const mapped = DOC_FIELD_MAP[key];
      if (mapped && mapped.length > 0) {
        if (DOC_STATUS_FIELDS.has(mapped)) {
          output[mapped] = statusToLabel(String(value));
        } else if (NUMERIC_FIELDS.has(mapped) && !KEEP_CAMELCASE.has(mapped)) {
          output[mapped] = parseNumber(value);
        } else if (mapped === "DocTotal" && !KEEP_CAMELCASE.has(mapped)) {
          output[mapped] = parseNumber(value);
        } else {
          output[mapped] = value;
        }
      }
      continue;
    }

    // Passthrough for fields without explicit mapping
    output[key] = value;
  }

  // Handle numeric strings in common fields
  if ("DocTotal" in output && typeof output.DocTotal === "string") {
    output.DocTotal = parseNumber(output.DocTotal);
  }
  if ("id" in output) {
    output.id = parseNumber(output.id);
  }
  // Normalise nullable string fields: SQL nullable columns return null; coerce to ""
  // so the response shape matches HANA (which always returns strings for these fields).
  if ("CardName" in output && output.CardName === null) {
    output.CardName = "";
  }
  if ("DocCurr" in output && output.DocCurr === null) {
    output.DocCurr = "";
  }

  // Dynamically compute BalanceDue for invoices and credit memos
  if ("DocTotal" in output && "paidToDate" in output) {
    const total = Number(output.DocTotal ?? 0);
    const paid = Number(output.paidToDate ?? 0);
    output.BalanceDue = Math.round((total - paid) * 100) / 100;
  }

  return output;
};

const transformLineItem = (line: Record<string, unknown>): Record<string, unknown> => {
  if (!line || typeof line !== "object") {
    return line;
  }

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
    // Passthrough
    output[key] = value;
  }

  // Ensure both Price and UnitPrice are populated and identical
  if ("UnitPrice" in output && !("Price" in output)) {
    output.Price = output.UnitPrice;
  } else if ("Price" in output && !("UnitPrice" in output)) {
    output.UnitPrice = output.Price;
  }

  return output;
};

/** Transform a single document row from camelCase to PascalCase */
export const toPascalCase = (row: Record<string, unknown>): Record<string, unknown> =>
  transformRow(row);

/** Transform a paginated list result from camelCase to PascalCase */
export const toPascalCaseList = (result: {
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
} => {
  const transformed = {
    data: (result.data || []).map((row: Record<string, unknown>) => transformRow(row)),
    limit: result.limit ?? 20,
    page: result.page ?? 1,
    total: result.total ?? 0,
    totalPages: result.totalPages ?? 1,
  };
  return transformed;
};

/** Transform a raw docnums array (returns array of docnum values) */
export const toPascalCaseDocnums = (rows: unknown[]): { code: string; name: string }[] => {
  if (!Array.isArray(rows)) {
    return [];
  }
  return rows.map((item: unknown) => {
    if (typeof item === "object" && item !== null) {
      const itemRecord = item as Record<string, unknown>;
      const code = String(itemRecord.docNum ?? itemRecord.code ?? "");
      const name = String(itemRecord.name ?? itemRecord.code ?? itemRecord.docNum ?? "");
      return { code, name };
    }
    const stringified = String(item);
    return { code: stringified, name: stringified };
  });
};
