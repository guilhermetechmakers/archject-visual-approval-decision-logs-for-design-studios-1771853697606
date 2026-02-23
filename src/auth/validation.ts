import { z } from 'zod'

export const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export type ResendVerificationFormData = z.infer<typeof resendVerificationSchema>
