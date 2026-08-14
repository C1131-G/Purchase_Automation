import { z } from "zod";
import { SAP_FIELD_MAX } from "@/validation/schemas/inputs/sap-document-fields";

const alphanumericId = z
  .string()
  .trim()
  .max(SAP_FIELD_MAX.lotNumber)
  .regex(/^[A-Za-z0-9]+$/, "Batch/serial numbers must be alphanumeric");

const optionalAlphanumericId = z
  .string()
  .trim()
  .max(SAP_FIELD_MAX.manufacturerSerial)
  .optional()
  .transform((value) => (value ? value : undefined))
  .refine((value) => value === undefined || /^[A-Za-z0-9]+$/.test(value), {
    message: "Batch/serial numbers must be alphanumeric",
  });

export const SapBatchNumberInputSchema = z.object({
  AddmisionDate: z.string().optional(),
  BatchNumber: alphanumericId,
  ExpiryDate: z.string().optional(),
  ManufacturingDate: z.string().optional(),
  Notes: z.string().max(SAP_FIELD_MAX.comments).optional(),
  Quantity: z.number().positive(),
});

export const SapSerialNumberInputSchema = z.object({
  ExpiryDate: z.string().optional(),
  InternalSerialNumber: alphanumericId,
  ManufacturerSerialNumber: optionalAlphanumericId,
  Quantity: z.number().positive().optional(),
});

export const SapBinAllocationInputSchema = z.object({
  BinAbsEntry: z.number().int().positive(),
  Quantity: z.number().positive(),
  SerialAndBatchNumbersBaseLine: z.number().int().nonnegative(),
});

export const sapLotCollectionsFields = {
  BatchNumbers: z.array(SapBatchNumberInputSchema).optional(),
  DocumentLinesBinAllocations: z.array(SapBinAllocationInputSchema).optional(),
  SerialNumbers: z.array(SapSerialNumberInputSchema).optional(),
};
