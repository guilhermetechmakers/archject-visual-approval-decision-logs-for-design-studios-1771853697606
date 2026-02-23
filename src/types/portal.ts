/** Portal-specific types for token-authenticated client experience */

export interface PortalDecisionOption {
  id: string
  label: string
  description?: string
  imageUrl?: string
  mediaUrl?: string
  priceEstimate?: string
  swatch?: string
  selected?: boolean
}

export interface PortalDecision {
  id: string
  projectId: string
  title: string
  summary?: string
  description?: string
  options: PortalDecisionOption[]
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'archived'
  createdAt: string
  updatedAt: string
  approvedAt?: string
  approvedByName?: string
  approvedOptionId?: string
  lastConfirmedAt?: string
  lastConfirmedBy?: string
  attachments?: PortalAttachment[]
}

export interface PortalComment {
  id: string
  decisionId: string
  parentCommentId?: string | null
  authorId?: string
  authorName?: string
  content: string
  createdAt: string
  attachments?: PortalAttachment[]
}

export interface PortalAttachment {
  id: string
  filename: string
  url: string
  mimeType?: string
  size?: number
}

export interface PortalApproval {
  id: string
  decisionId: string
  approverName?: string
  approvedAt: string
  status: 'approved' | 'declined' | 'pending'
  note?: string
}

export interface PortalAuditLogEntry {
  id: string
  decisionId: string
  action: string
  actor?: string
  actorId?: string
  timestamp: string
  details?: Record<string, unknown>
}

export interface PortalNotification {
  id: string
  type: string
  message: string
  link?: string
  read: boolean
  createdAt: string
}

export interface PortalBranding {
  studioId?: string
  logoUrl?: string
  primaryColor?: string
  secondaryColor?: string
  backgroundColor?: string
  colorPalette?: Record<string, string>
  customDomain?: string
  domainStatus?: string
}

export interface TokenStatusResponse {
  valid: boolean
  expiresAt?: string
  projectId?: string
  allowedDecisionIds?: string[]
  message?: string
}

/** Alias for token status used by client-portal API */
export type TokenStatus = TokenStatusResponse
