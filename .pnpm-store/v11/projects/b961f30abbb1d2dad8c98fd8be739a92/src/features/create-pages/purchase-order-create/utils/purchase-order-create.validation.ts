import type { ZodError } from "zod";

export const getSearchPrereqMissing = (
  nameInput: string,
  codeInput: string,
  salesEmployeeInput: string,
  effectiveWarehouseCode: string,
) => ({
  buyer: !salesEmployeeInput.trim(),
  vendorCode: !codeInput.trim(),
  vendorName: !nameInput.trim(),
  warehouse: !effectiveWarehouseCode.trim(),
});

export const canSearchProductsFromPrereq = (searchPrereqMissing: Record<string, boolean>) =>
  Object.values(searchPrereqMissing).every((isMissing) => !isMissing);

export const getSearchProductsBlockedReason = (
  searchPrereqTouched: boolean,
  canSearchProducts: boolean,
) =>
  searchPrereqTouched && !canSearchProducts
    ? "Select Vendor Name, Vendor Code, Buyer, and Warehouse before searching products."
    : null;

export const getZodTopLevelFieldErrors = (error: ZodError) => [
  ...new Set(
    error.issues
      .map((issue) => issue.path[0])
      .filter((field): field is string => typeof field === "string"),
  ),
];
