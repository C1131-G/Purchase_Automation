import { z } from "zod";

export const CreateBusinessPartnerSchema = z.object({
  code: z.string().min(1).trim(),
  name: z.string().min(1).trim(),
  type: z.enum(["S", "C"]).default("S"),
  currency: z.string().optional(),
  salesEmployeeCode: z.coerce.number().int().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  billToAddress: z.string().optional(),
  shipToAddress: z.string().optional(),
});

export const UpdateBusinessPartnerSchema = CreateBusinessPartnerSchema.partial();

export const BusinessPartnerListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
  search: z.string().optional(),
  type: z.enum(["S", "C"]).optional(),
  frozen: z.coerce.boolean().optional(),
});

export const BusinessPartnerGetParamSchema = z.object({
  code: z.string().min(1),
});
