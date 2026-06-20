import { z } from "zod";

export const NUMBER_ONLY_COLUMN_IDS = new Set(["DocNum"]);
export const ALPHANUMERIC_COLUMN_IDS = new Set(["CardCode", "Filler", "ToWhsCode"]);
export const LETTERS_SYMBOLS_COLUMN_IDS = new Set<string>([]);

export const NUMBER_ONLY_MIN_LENGTH = 1;
export const NUMBER_ONLY_MAX_LENGTH = 10;
export const ALPHANUMERIC_MIN_LENGTH = 1;
export const ALPHANUMERIC_MAX_LENGTH = 10;
export const LETTERS_SYMBOLS_MIN_LENGTH = 1;
export const LETTERS_SYMBOLS_MAX_LENGTH = 50;

export const DOC_TOTAL_MIN = 0;
export const DOC_TOTAL_MAX = 999_999_999;

const numberOnlySchema = z.string().regex(/^\d*$/).max(NUMBER_ONLY_MAX_LENGTH);
const alphanumericSchema = z
  .string()
  .regex(/^[a-zA-Z0-9]*$/)
  .max(ALPHANUMERIC_MAX_LENGTH);
const lettersSymbolsSchema = z
  .string()
  .regex(/^[^0-9]*$/)
  .max(LETTERS_SYMBOLS_MAX_LENGTH);
const docTotalDraftSchema = z.string().regex(/^\d{0,9}(\.\d{0,4})?$/);
const docTotalValueSchema = z.number().min(DOC_TOTAL_MIN).max(DOC_TOTAL_MAX);

export const normalizeSearchInputByColumn = (columnId: string | undefined, value: string) => {
  if (columnId && NUMBER_ONLY_COLUMN_IDS.has(columnId)) {
    const candidate = value.replaceAll(/\D+/g, "").slice(0, NUMBER_ONLY_MAX_LENGTH);
    return numberOnlySchema.safeParse(candidate).success ? candidate : "";
  }

  if (columnId && ALPHANUMERIC_COLUMN_IDS.has(columnId)) {
    const candidate = value.replaceAll(/[^a-zA-Z0-9]/g, "").slice(0, ALPHANUMERIC_MAX_LENGTH);
    return alphanumericSchema.safeParse(candidate).success ? candidate : "";
  }

  if (columnId && LETTERS_SYMBOLS_COLUMN_IDS.has(columnId)) {
    const candidate = value.replaceAll(/[0-9]/g, "").slice(0, LETTERS_SYMBOLS_MAX_LENGTH);
    return lettersSymbolsSchema.safeParse(candidate).success ? candidate : "";
  }

  return value;
};

export const normalizeDocTotalInput = (value: string) => {
  const cleaned = value.replaceAll(/[^0-9.]/g, "");
  const [integerPart = "", ...rest] = cleaned.split(".");
  const decimalPart = rest.join("");
  const candidate =
    rest.length === 0
      ? integerPart.slice(0, 9)
      : `${integerPart.slice(0, 9)}.${decimalPart.slice(0, 4)}`;

  return docTotalDraftSchema.safeParse(candidate).success ? candidate : "";
};

export const parseDocTotalFilterValue = (value: string) => {
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  const result = docTotalValueSchema.safeParse(parsed);
  return result.success ? result.data : null;
};
