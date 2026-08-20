import {
  isIsoCalendarDate,
  NUMERIC_PROFILE,
  SAP_FIELD_MAX,
  VALIDATION_PATTERN,
} from "@vendor-portal/validation-contracts";
import { z } from "zod";

const hasAtMostDecimals = (value: number, digits: number): boolean => {
  const factor = 10 ** digits;
  return Math.abs(value * factor - Math.round(value * factor)) < Number.EPSILON * factor * 8;
};

const sapNumber = (minimum: number, maximum: number, fractionDigits: number) =>
  z
    .number()
    .finite()
    .min(minimum)
    .max(maximum)
    .refine((value) => hasAtMostDecimals(value, fractionDigits), {
      message: `Use at most ${fractionDigits} decimal places.`,
    });

export const sapIsoDateSchema = z
  .string()
  .regex(VALIDATION_PATTERN.isoDate, "Use YYYY-MM-DD.")
  .refine(isIsoCalendarDate, "Enter a valid calendar date.");

export const sapNonnegativeAmountSchema = sapNumber(
  NUMERIC_PROFILE.sapDecimal.min,
  NUMERIC_PROFILE.sapDecimal.max,
  NUMERIC_PROFILE.sapDecimal.fractionDigits,
);

export const sapPositiveQuantitySchema = sapNumber(
  NUMERIC_PROFILE.positiveQuantity.min,
  NUMERIC_PROFILE.positiveQuantity.max,
  NUMERIC_PROFILE.positiveQuantity.fractionDigits,
);

export const currencyAmountSchema = sapNumber(
  NUMERIC_PROFILE.currencyAmount.min,
  NUMERIC_PROFILE.currencyAmount.max,
  NUMERIC_PROFILE.currencyAmount.fractionDigits,
);

export const sapDiscountPercentSchema = sapNumber(
  NUMERIC_PROFILE.discountPercent.min,
  NUMERIC_PROFILE.discountPercent.max,
  NUMERIC_PROFILE.discountPercent.fractionDigits,
);

export const sapPositiveIntegerSchema = z
  .number()
  .int()
  .min(NUMERIC_PROFILE.positiveIntegerQuantity.min)
  .max(NUMERIC_PROFILE.positiveIntegerQuantity.max);

export const chequeNumberSchema = z
  .string()
  .regex(VALIDATION_PATTERN.digits, "Use digits only.")
  .max(SAP_FIELD_MAX.checkNumberDigits, "Cheque number is too long.");

export const sapRequiredText = (maximum: number) => z.string().trim().min(1).max(maximum);
