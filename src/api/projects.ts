import { api } from '@/lib/api'

export interface ProjectItem {
  id: string
  name: string
  description?: string
  status: 'active' | 'archived' | 'draft' | 'deleted'
  createdAt: string
  updatedAt: string
  deletedAt?: string
  pendingApprovalsCount: number
}

export type ProjectListItem = ProjectItem & {
  lastActivity?: string
  owner?: string
  colorAccent?: string
  pendingApprovals?: number
}

export interface ProjectsListResponse {
  items: ProjectListItem[]
  total: number
  page: number
  pageSize: number
}

export interface ProjectDetail extends ProjectItem {}

export async function getProjects(params?: {
  page?: number
  pageSize?: number
  search?: string
  includeDeleted?: boolean
}): Promise<ProjectsListResponse> {
  const search = new URLSearchParams()
  if (params?.page) search.set('page', String(params.page))
  if (params?.pageSize) search.set('pageSize', String(params.pageSize))
  if (params?.search) search.set('search', params.search)
  if (params?.includeDeleted) search.set('includeDeleted', 'true')
  const qs = search.toString()
  const res = await api.get<ProjectsListResponse>(`/projects${qs ? `?${qs}` : ''}`)
  return {
    ...res,
    items: res.items.map((p) => ({
      ...p,
      lastActivity: p.updatedAt,
      owner: 'You',
      colorAccent: '#0052CC',
      pendingApprovals: p.pendingApprovalsCount,
    })),
  }
}

export async function getProject(id: string): Promise<ProjectDetail> {
  return api.get<ProjectDetail>(`/projects/${id}`)
}

export interface CreateProjectPayload {
  name: string
  description?: string
}

export async function createProject(
  payload: CreateProjectPayload | string
): Promise<ProjectItem> {
  const body = typeof payload === 'string' ? { name: payload } : payload
  return api.post<ProjectItem>('/projects', body)
}

export interface UpdateProjectPayload {
  name?: string
  description?: string
}

export async function updateProject(id: string, payload: UpdateProjectPayload): Promise<ProjectItem> {
  return api.patch<ProjectItem>(`/projects/${id}`, payload)
}

export async function deleteProject(id: string): Promise<{ id: string; deletedAt: string }> {
  return api.delete<{ id: string; deletedAt: string }>(`/projects/${id}`)
}

export async function restoreProject(id: string): Promise<ProjectItem> {
  return api.post<ProjectItem>(`/projects/${id}/restore`, {})
}

export interface ProjectActivityItem {
  id: string
  decisionId: string
  decisionTitle: string
  action: string
  performedBy: string | null
  timestamp: string
}

export async function getProjectActivity(
  projectId: string,
  limit?: number
): Promise<{ items: ProjectActivityItem[] }> {
  const qs = limit ? `?limit=${limit}` : ''
  return api.get<{ items: ProjectActivityItem[] }>(`/projects/${projectId}/activity${qs}`)
}
