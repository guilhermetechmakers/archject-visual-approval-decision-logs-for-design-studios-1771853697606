/**
 * Centralized validation schemas for Archject.
 * Shared across forms: Decision creation, Exports, Reminders, Attachments.
 */

import { z } from 'zod'

/** Max lengths */
export const MAX_TITLE_LENGTH = 256
export const MAX_DESCRIPTION_LENGTH = 4096
export const MAX_OPTION_TITLE_LENGTH = 128
export const MAX_OPTION_DESC_LENGTH = 512
export const MAX_EMAIL_LENGTH = 254
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
export const MAX_FILES_COUNT = 10
export const MAX_ATTACHMENT_SIZE_BYTES = MAX_FILE_SIZE_BYTES
export const MAX_ATTACHMENTS_COUNT = MAX_FILES_COUNT
export const ACCEPTED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']

/** Common patterns */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Option schema */
export const optionSchema = z.object({
  id: z.string().optional(),
  title: z
    .string()
    .min(1, 'Option title is required')
    .max(MAX_OPTION_TITLE_LENGTH, `Max ${MAX_OPTION_TITLE_LENGTH} characters`),
  description: z.string().max(MAX_OPTION_DESC_LENGTH).optional(),
  isDefault: z.boolean().optional(),
  isRecommended: z.boolean().optional(),
})

/** Recipient schema */
export const recipientSchema = z.object({
  id: z.string().optional(),
  contactEmail: z
    .string()
    .min(1, 'Email is required')
    .max(MAX_EMAIL_LENGTH)
    .regex(EMAIL_REGEX, 'Invalid email format'),
  role: z.enum(['client', 'observer']).default('client'),
})

/** Reminder schema */
export const reminderSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['email', 'in-app']).default('email'),
  schedule: z.string().min(1, 'Schedule is required'),
  message: z.string().max(512).optional(),
})

/** Attachment schema (metadata only; file validation is separate) */
export const attachmentSchema = z.object({
  id: z.string(),
  url: z.string().url().optional(),
  type: z.string(),
  size: z.number().positive().optional(),
  uploadedAt: z.string().datetime().optional(),
})

/** Decision create/update schema */
export const decisionCreateSchema = z.object({
  title: z
    .string()
    .min(1, 'Decision title is required')
    .max(MAX_TITLE_LENGTH, `Max ${MAX_TITLE_LENGTH} characters`),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
  templateId: z.string().optional().nullable(),
  fromScratch: z.boolean().optional(),
  options: z
    .array(optionSchema)
    .min(1, 'Add at least one option'),
  approvalDeadline: z.string().optional().or(z.literal('')),
  recipients: z.array(recipientSchema).optional(),
  reminders: z.array(reminderSchema).optional(),
})

/** Export request schema */
export const exportRequestSchema = z.object({
  projectId: z.string().min(1, 'Select a project'),
  decisionIds: z.array(z.string()).min(1, 'Select at least one decision'),
  format: z.enum(['PDF', 'CSV']),
  includeAttachments: z.boolean().optional(),
  brandingProfileId: z.string().optional().nullable(),
  signatureRequested: z.boolean().optional(),
})

/** File validation for attachments */
export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: `File exceeds ${Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024)}MB limit` }
  }
  const type = file.type?.toLowerCase() ?? ''
  const ext = file.name?.split('.').pop()?.toLowerCase() ?? ''
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
  const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf']

  const typeOk = allowedTypes.some((a) => type === a || type.startsWith('image/'))
  const extOk = allowedExts.includes(ext)
  if (!typeOk && !extOk) {
    return { valid: false, error: 'Allowed: images (JPEG, PNG, WebP, GIF) and PDF' }
  }
  return { valid: true }
}

/** Validate date-time string (ISO or datetime-local) */
export function isValidDateTime(value: string): boolean {
  if (!value?.trim()) return true
  const d = new Date(value)
  return !Number.isNaN(d.getTime())
}

/** Validate timezone string */
export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz })
    return true
  } catch {
    return false
  }
}

export type DecisionCreateInput = z.infer<typeof decisionCreateSchema>
export type ExportRequestInput = z.infer<typeof exportRequestSchema>
export type OptionInput = z.infer<typeof optionSchema>
export type RecipientInput = z.infer<typeof recipientSchema>
export type ReminderInput = z.infer<typeof reminderSchema>
