import { z } from "zod";
import { NUMERIC_PROFILE } from "@/validation/validation-contracts";

const hasAtMostDecimals = (value: number, digits: number): boolean => {
  const factor = 10 ** digits;
  return Math.abs(value * factor - Math.round(value * factor)) < Number.EPSILON * factor * 8;
};

const createSapDecimalSchema = (minimum: number, maximum = NUMERIC_PROFILE.sapDecimal.max) =>
  z
    .number()
    .finite()
    .min(minimum)
    .max(maximum)
    .refine(
      (value) => hasAtMostDecimals(value, NUMERIC_PROFILE.sapDecimal.fractionDigits),
      "Must have at most 6 decimal places",
    );

export const sapNonnegativeAmountSchema = createSapDecimalSchema(0);
export const sapPositiveAmountSchema = createSapDecimalSchema(Number.MIN_VALUE);
export const sapPositiveQuantitySchema = createSapDecimalSchema(Number.MIN_VALUE);
export const sapPositiveIntegerSchema = z
  .number()
  .int()
  .positive()
  .max(NUMERIC_PROFILE.positiveIntegerQuantity.max);
export const sapNonnegativeIntegerSchema = z
  .number()
  .int()
  .nonnegative()
  .max(NUMERIC_PROFILE.positiveIntegerQuantity.max);
export const sapDiscountPercentSchema = z
  .number()
  .finite()
  .min(0)
  .max(NUMERIC_PROFILE.discountPercent.max)
  .refine(
    (value) => hasAtMostDecimals(value, NUMERIC_PROFILE.discountPercent.fractionDigits),
    "Must have at most 3 decimal places",
  );

export const strictDecimalQuerySchema = z
  .string()
  .regex(
    new RegExp(
      `^\\d{1,${NUMERIC_PROFILE.sapDecimal.integerDigits}}(?:\\.\\d{1,${NUMERIC_PROFILE.sapDecimal.fractionDigits}})?$`,
    ),
    "Use an unsigned decimal number",
  )
  .transform((value) => Number(value))
  .pipe(sapNonnegativeAmountSchema);
