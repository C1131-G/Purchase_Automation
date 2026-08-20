import { z } from "zod";
import { NUMERIC_PROFILE } from "@vendor-portal/validation-contracts";

const createUnsignedDecimalDraftSchema = (integerDigits: number, decimalDigits: number) =>
  z
    .string()
    .regex(
      new RegExp(`^\\d{0,${integerDigits}}(?:\\.\\d{0,${decimalDigits}})?$`),
      "Use digits and one decimal point only",
    );

export const decimalDraftSchemas = {
  currencyAmount: createUnsignedDecimalDraftSchema(
    NUMERIC_PROFILE.currencyAmount.integerDigits,
    NUMERIC_PROFILE.currencyAmount.fractionDigits,
  ),
  digitsOnly: z.string().regex(/^\d*$/, "Use digits only"),
  discountPercent: createUnsignedDecimalDraftSchema(
    NUMERIC_PROFILE.discountPercent.integerDigits,
    NUMERIC_PROFILE.discountPercent.fractionDigits,
  ),
  documentTotal: createUnsignedDecimalDraftSchema(
    NUMERIC_PROFILE.documentTotal.integerDigits,
    NUMERIC_PROFILE.documentTotal.fractionDigits,
  ),
  positiveIntegerQuantity: createUnsignedDecimalDraftSchema(
    NUMERIC_PROFILE.positiveIntegerQuantity.integerDigits,
    NUMERIC_PROFILE.positiveIntegerQuantity.fractionDigits,
  ),
  positiveQuantity: createUnsignedDecimalDraftSchema(
    NUMERIC_PROFILE.positiveQuantity.integerDigits,
    NUMERIC_PROFILE.positiveQuantity.fractionDigits,
  ),
  sapDecimal: createUnsignedDecimalDraftSchema(
    NUMERIC_PROFILE.sapDecimal.integerDigits,
    NUMERIC_PROFILE.sapDecimal.fractionDigits,
  ),
} as const;

export type NumericDraftProfile = keyof typeof decimalDraftSchemas;

const numericProfileRules = NUMERIC_PROFILE;

type NumericCommitProfile = Exclude<keyof typeof numericProfileRules, "digitsOnly">;

export const isNumericDraft = (value: string, profile: NumericDraftProfile): boolean =>
  decimalDraftSchemas[profile].safeParse(value).success;

export const numericDraftError = (
  value: string,
  profile: NumericDraftProfile,
): string | undefined => decimalDraftSchemas[profile].safeParse(value).error?.issues[0]?.message;

export const parseNumericDraft = (
  value: string,
  profile: NumericCommitProfile,
): number | undefined => {
  if (!isNumericDraft(value, profile) || value === "" || value.endsWith(".")) {
    return undefined;
  }

  const parsed = Number(value);
  const rule = numericProfileRules[profile];
  if (!Number.isFinite(parsed) || parsed < rule.min || parsed > rule.max) {
    return undefined;
  }

  return parsed;
};

export const nextNumericDraft = (
  previousValue: string,
  nextValue: string,
  profile: NumericDraftProfile,
): string => (isNumericDraft(nextValue, profile) ? nextValue : previousValue);
