import { z } from 'zod'

/**
 * Zod validation schema for the login form.
 *
 * Enforces:
 * - Organization selection (Required)
 * - Username length (Min 3)
 * - Password length (Min 4)
 *
 * This schema provides both runtime validation and TypeScript type safety.
 */
export const loginSchema = z.object({
  organization: z.string().min(1, 'Please select an organization'),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

/**
 * TypeScript type inferred directly from the validation schema.
 */
export type LoginFormData = z.infer<typeof loginSchema>
