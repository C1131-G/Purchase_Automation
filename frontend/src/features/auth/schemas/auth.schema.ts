import { z } from 'zod'

// Login Schema: Zod validation for organization, username, and password with Industrial constraints.
export const loginSchema = z.object({
  organization: z.string().min(1, 'Please select an organization'),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

// LoginFormData: TypeScript type inferred directly from the validation schema.
export type LoginFormData = z.infer<typeof loginSchema>
