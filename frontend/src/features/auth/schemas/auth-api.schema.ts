import { z } from "zod";

export const organizationSchema = z.object({
  companyName: z.string(),
  dbName: z.string(),
  dbServer: z.string(),
});

export const userSchema = z.object({
  dbName: z.string(),
  dbServer: z.string(),
  userName: z.string(),
  companyName: z.string(),
});

export const loginRequestSchema = z.object({
  companyDB: z.string(),
  password: z.string(),
  username: z.string(),
});

export const organizationsResponseSchema = z.object({
  data: z.array(organizationSchema),
  success: z.boolean(),
});

export const authUserResponseSchema = z.object({
  data: z.object({
    user: userSchema,
  }),
  success: z.boolean(),
});

export const logoutResponseSchema = z.object({
  message: z.string(),
  success: z.boolean(),
});
