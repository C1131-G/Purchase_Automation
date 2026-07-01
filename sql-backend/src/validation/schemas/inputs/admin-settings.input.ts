import { z } from "zod";

export const UpdateAdminSettingSchema = z.object({
  code: z.string().min(1).trim(),
  value: z.string().optional(),
});
