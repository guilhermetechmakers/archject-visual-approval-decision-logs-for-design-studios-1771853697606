/** Studio Settings & Team Management types */

export interface BrandingColors {
  primary: string
  secondary: string
  background: string
  text: string
  accent: string
}

export interface ClientLinkBranding {
  enabled: boolean
  customDomain: string | null
  logoUrl: string | null
  colorTokens: BrandingColors
  domainValidated: boolean
}

export interface EmailTemplatePlaceholder {
  key: string
  label: string
}

export interface EmailTemplateItem {
  id: string
  name: string
  subject: string
  body: string
  placeholders: EmailTemplatePlaceholder[]
}

export interface StudioBranding {
  logoUrl: string | null
  faviconUrl: string | null
  primaryColor: string
  secondaryColor: string
  emailTemplates: EmailTemplateItem[]
  clientLinkBranding: ClientLinkBranding
}

export type TeamRole = 'admin' | 'editor' | 'viewer'
export type MemberStatus = 'invited' | 'active' | 'removed'

export interface TeamPolicy {
  defaultRole: TeamRole
  maxSeats: number
  seatsUsed: number
  invitationTokenExpiry: number
}

export interface StudioTeamMember {
  id: string
  studioId: string
  userId: string | null
  email: string
  role: TeamRole
  status: MemberStatus
  lastActive: string | null
  invitedAt?: string
  name?: string | null
}

export type ReminderCadence = 'immediately' | 'daily' | 'weekly'

export interface ProjectDefaults {
  reminderCadence: ReminderCadence
  exportFormats: ('pdf' | 'csv' | 'json')[]
  autoNotification: boolean
}

export interface BackupSchedule {
  frequency: 'daily' | 'weekly'
  lastBackupAt: string | null
  retentionPeriod: number
}

export interface DriveIntegration {
  enabled: boolean
  provider: 'google_drive' | 'dropbox'
  folderMappings?: string[]
  fileTypePreferences?: string[]
  connectedAt?: string
}

export interface CalendarIntegration {
  enabled: boolean
  calendarId: string | null
  syncWindow?: '7d' | '14d' | '30d'
  defaultReminders?: string[]
  connectedAt?: string
}

export interface BIMIntegration {
  enabled: boolean
  settings?: { previewEnabled?: boolean; assetLinkage?: boolean }
  connectedAt?: string
}

export interface StudioIntegrations {
  drive: DriveIntegration
  calendar: CalendarIntegration
  bimForge: BIMIntegration
}

export interface BrandingSettings {
  logoUrl: string | null
  faviconUrl: string | null
  primaryColor: string
  secondaryColor: string
  backgroundColor: string
  textColor: string
  accentColor: string
  emailTemplates: EmailTemplateItem[]
  clientLinkBranding: ClientLinkBranding
}

export type IntegrationsSettings = StudioIntegrations

export type ProjectDefaultsSettings = ProjectDefaults

export interface BackupSettings {
  schedule: 'daily' | 'weekly'
  lastBackupAt: string | null
  retentionPeriod: number
  exportFormats: ('json' | 'csv' | 'pdf')[]
}

export interface Invoice {
  id: string
  date: string
  amount: number
  currency: string
  status: 'paid' | 'pending' | 'failed' | 'refunded'
  downloadUrl?: string
}

export interface PaymentMethod {
  id: string
  type: 'card' | 'bank'
  last4?: string
  brand?: string
  expiryMonth?: number
  expiryYear?: number
  isDefault: boolean
}
