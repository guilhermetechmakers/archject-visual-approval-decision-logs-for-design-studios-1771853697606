import { api } from '@/lib/api'

export interface DashboardProject {
  id: string
  name: string
  status: 'active' | 'archived' | 'draft'
  createdAt: string
  updatedAt: string
  pendingApprovalsCount: number
}

export interface DashboardRecentDecision {
  id: string
  title: string
  project: string
  status: string
  date: string
  projectId: string
}

export interface DashboardQuickAction {
  id: string
  label: string
  href: string
  icon: string
}

export interface DashboardPendingApproval {
  id: string
  title: string
  client: string
  project: string
}

export interface DashboardSummary {
  projects: DashboardProject[]
  recentDecisions: DashboardRecentDecision[]
  pendingApprovals?: DashboardPendingApproval[]
  pendingApprovalsCount: number
  quickActions: DashboardQuickAction[]
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  return api.get<DashboardSummary>('/dashboard/summary')
}
