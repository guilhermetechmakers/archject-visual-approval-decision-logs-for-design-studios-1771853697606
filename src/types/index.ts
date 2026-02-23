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

export type DecisionStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'archived'

export interface DecisionOption {
  id: string
  label: string
  imageUrl?: string
  description?: string
  selected?: boolean
}

export interface Decision {
  id: string
  projectId: string
  title: string
  description?: string
  options: DecisionOption[]
  status: DecisionStatus
  approvedOptionId?: string
  approvedAt?: string
  approvedByName?: string
  createdAt: string
  updatedAt: string
  dueDate?: string
}

export interface Template {
  id: string
  name: string
  description?: string
  optionCount: number
  usageCount: number
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
