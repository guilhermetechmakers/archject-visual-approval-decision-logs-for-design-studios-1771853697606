export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
  role: 'admin' | 'member' | 'viewer'
}

export interface Project {
  id: string
  name: string
  description?: string
  status: 'active' | 'archived' | 'draft'
  createdAt: string
  updatedAt: string
  pendingApprovalsCount?: number
}

export type DecisionStatus =
  | 'draft'
  | 'pending'
  | 'published'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'archived'
  | 'voided'

export interface DecisionOption {
  id: string
  label: string
  imageUrl?: string
  description?: string
  selected?: boolean
  drawingIds?: string[]
  priceImpact?: string
  costImpact?: string
  isDefault?: boolean
  isRecommended?: boolean
  metadata?: Record<string, unknown>
}

export interface ReviewerAssignment {
  userId?: string
  role?: string
  order: number
  required: boolean
  responseStatus?: 'pending' | 'approved' | 'rejected' | 'commented'
  responseTimestamp?: string
}

export interface ApprovalEvent {
  eventId: string
  optionId?: string
  approverId: string
  action: 'commented' | 'approved' | 'rejected' | 'pending'
  timestamp: string
  ip?: string
}

export interface DecisionComment {
  id: string
  authorId: string
  text: string
  parentOptionId?: string | null
  timestamp: string
  attachments?: string[]
}

export interface DecisionReminder {
  id: string
  recipientId: string
  schedule: string
  lastSent?: string
  status: 'active' | 'sent' | 'cancelled'
}

export interface DecisionAttachment {
  id: string
  type: 'image' | 'drawing' | 'document'
  url: string
  name: string
  size: number
  uploadedAt: string
}

export interface AuditEntry {
  id: string
  action: string
  actorId?: string
  targetDecisionId: string
  details?: Record<string, unknown>
  timestamp: string
  ip?: string
}

export interface Decision {
  id: string
  projectId: string
  title: string
  description?: string
  options: DecisionOption[]
  status: DecisionStatus
  templateId?: string | null
  templateVersion?: number
  approvedOptionId?: string
  approvedAt?: string
  approvedByName?: string
  reviewers?: ReviewerAssignment[]
  approvals?: ApprovalEvent[]
  comments?: DecisionComment[]
  reminders?: DecisionReminder[]
  auditTrail?: AuditEntry[]
  attachments?: DecisionAttachment[]
  version?: number
  versionNumber?: number
  clonedFromDecisionId?: string | null
  isArchived?: boolean
  archivedAt?: string | null
  archivedBy?: string | null
  createdAt: string
  updatedAt: string
  createdBy?: string
  updatedBy?: string
  dueDate?: string
  etag?: string
  metadata?: Record<string, unknown>
}

export interface Template {
  id: string
  name: string
  description?: string
  optionCount: number
  usageCount: number
}

export type TemplateType = 'FINISHES' | 'LAYOUTS' | 'CHANGE_REQUESTS' | 'VARIATIONS' | 'PERMITS'

export interface TemplateLibraryItem {
  id: string
  name: string
  description?: string
  type: TemplateType
  content: { defaultOptions?: { title: string; description?: string; isDefault?: boolean; isRecommended?: boolean }[] }
  tags: string[]
  ownerId: string
  projectId?: string | null
  version: number
  createdAt: string
  updatedAt: string
  isArchived: boolean
  reminderSchedule?: string | null
  usageCount: number
  optionCount: number
}

export interface TemplateVersion {
  id: string
  versionNumber: number
  createdAt: string
  changesSummary: string
  contentSnapshot: Record<string, unknown> | null
}

export interface TemplateDetail extends TemplateLibraryItem {
  versions: TemplateVersion[]
}

export type TemplateLibraryType =
  | 'FINISHES'
  | 'LAYOUTS'
  | 'CHANGE_REQUESTS'
  | 'VARIATIONS'
  | 'PERMITS'

export interface TemplateLibraryContent {
  defaultOptions?: { title: string; description?: string; isDefault?: boolean; isRecommended?: boolean }[]
}

export interface TemplateLibrary {
  id: string
  name: string
  description?: string
  type: TemplateLibraryType
  content: TemplateLibraryContent
  tags: string[]
  ownerId: string
  projectId?: string | null
  version: number
  createdAt: string
  updatedAt: string
  isArchived: boolean
  isDeleted?: boolean
  reminderSchedule?: string | null
  usageCount?: number
  optionCount?: number
}

export interface TemplateLibraryVersion {
  id: string
  templateId: string
  versionNumber: number
  createdAt: string
  changesSummary?: string
  contentSnapshot?: TemplateLibraryContent
}

export interface ProjectTemplateApplyLog {
  id: string
  projectId: string
  templateId: string
  appliedAt: string
  appliedBy: string
  scopeDetail?: Record<string, unknown>
  result: string
}

export interface ActivityItem {
  id: string
  type: 'decision_created' | 'decision_approved' | 'comment_added' | 'file_uploaded'
  message: string
  timestamp: string
  userId?: string
  userName?: string
}

export interface Notification {
  id: string
  title: string
  message: string
  read: boolean
  createdAt: string
  link?: string
}

export type NotificationType = 'reminder' | 'approval' | 'comment' | 'export'
export type NotificationFrequency = 'immediate' | 'daily_digest' | 'weekly_digest'

export interface NotificationItem {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  relatedDecisionId: string | null
  relatedProjectId: string | null
  readAt: string | null
  createdAt: string
  source: string
  attachments: string[]
}

export interface PerProjectSetting {
  projectId: string
  projectName?: string
  inAppEnabled: boolean
  emailEnabled: boolean
  frequency: string
}

export interface NotificationSettings {
  id: string | null
  userId: string
  inAppEnabled: boolean
  emailEnabled: boolean
  defaultFrequency: NotificationFrequency
  perProjectSettings: PerProjectSetting[]
  lastUpdated: string | null
}

export interface ReminderTemplate {
  id: string
  name: string
  subject: string
  bodyHtml: string
  bodyText: string
  placeholders: string[]
  updatedAt: string
}

export interface NotificationCenterItem {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  relatedDecisionId?: string | null
  relatedProjectId?: string | null
  readAt: string | null
  createdAt: string
  source: string
  attachments?: string[]
}

export type FileScanStatus = 'PENDING' | 'SCANNED' | 'CLEAN' | 'INFECTED'

export interface LibraryFile {
  id: string
  projectId: string
  filename: string
  filepath: string
  filetype: string
  size: number
  uploaderId?: string
  uploadedAt: string
  currentVersionId?: string
  currentVersion: number
  isArchived: boolean
  thumbnailUrl?: string
  downloadUrl?: string
  scanStatus?: FileScanStatus | string
  previewUrl?: string
}

export interface LibraryFileVersion {
  id: string
  fileId: string
  versionNumber: number
  filepath: string
  size: number
  uploadedAt: string
  uploaderId?: string
  notes?: string
}

export interface FileAttachment {
  id: string
  fileId: string
  decisionId: string
  notes?: string
  attachedAt: string
}
