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
  projectId?: string
}

export interface DashboardSummary {
  projects: DashboardProject[]
  recentDecisions: DashboardRecentDecision[]
  pendingApprovals?: DashboardPendingApproval[]
  pendingApprovalsCount: number
  quickActions: DashboardQuickAction[]
}

export interface DashboardMetrics {
  pendingApprovals: number
  activeProjects: number
  avgResponseTimeMs: number
  exportCredits: number
}

export interface DashboardProjectItem {
  id: string
  name: string
  status: string
  lastActivity: string
  pendingApprovals: number
  owner: string
  colorAccent: string
}

export interface DashboardProjectsResponse {
  items: DashboardProjectItem[]
  total: number
  page: number
  pageSize: number
}

export interface DashboardActivityItem {
  id: string
  actorId: string
  actorName: string
  avatarUrl: string | null
  action: string
  targetType: string
  targetId: string
  targetTitle?: string
  projectId?: string
  projectName?: string
  timestamp: string
}

export interface DashboardActivitiesResponse {
  items: DashboardActivityItem[]
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  return api.get<DashboardSummary>('/dashboard/summary')
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  return api.get<DashboardMetrics>('/dashboard/metrics')
}

export async function getDashboardProjects(params?: {
  page?: number
  pageSize?: number
  search?: string
}): Promise<DashboardProjectsResponse> {
  const search = new URLSearchParams()
  if (params?.page) search.set('page', String(params.page))
  if (params?.pageSize) search.set('pageSize', String(params.pageSize))
  if (params?.search) search.set('search', params.search)
  const qs = search.toString()
  return api.get<DashboardProjectsResponse>(`/dashboard/projects${qs ? `?${qs}` : ''}`)
}

export async function getDashboardActivities(): Promise<DashboardActivitiesResponse> {
  return api.get<DashboardActivitiesResponse>('/dashboard/activities')
}

export async function createProject(name: string): Promise<DashboardProject> {
  return api.post<DashboardProject>('/dashboard/projects', { name })
}
