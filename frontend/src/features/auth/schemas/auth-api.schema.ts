import { z } from 'zod'

export const organizationSchema = z.object({
  dbName: z.string(),
  companyName: z.string(),
  dbServer: z.string(),
})

export const userSchema = z.object({
  userName: z.string(),
  dbName: z.string(),
  dbServer: z.string(),
})

export const loginRequestSchema = z.object({
  username: z.string(),
  password: z.string(),
  companyDB: z.string(),
})

export const organizationsResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(organizationSchema),
})

export const authUserResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    user: userSchema,
  }),
})

export const logoutResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
})
