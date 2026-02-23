export interface AnalyticsKPIs {
  medianApprovalSeconds: number
  p90ApprovalSeconds: number
  pctWithinSla: number
  totalDecisions: number
  avgResponseSeconds: number
  pendingCount: number
}

export interface AnalyticsDecision {
  id: string
  projectId: string
  projectName: string
  title: string
  status: string
  type: string
  createdAt: string
  decisionMadeAt: string | null
  reviewerId: string | null
  timeToDecisionSeconds: number | null
}

export interface DistributionBucket {
  bucket: string
  count: number
  bucketStart: number
  bucketEnd: number
}

export interface ProjectAnalyticsResponse {
  kpis: AnalyticsKPIs
  byStatus: Record<string, number>
  byReviewer: Record<string, number>
  distribution: DistributionBucket[]
  decisions: {
    id: string
    title: string
    status: string
    reviewerId: string | null
    createdAt: string
    decisionMadeAt: string | null
    timeToDecisionSeconds: number
  }[]
}

export interface DecisionsListResponse {
  decisions: AnalyticsDecision[]
  total: number
  page: number
  limit: number
}

export interface ExportRecord {
  id: string
  scope: { projectId?: string }
  format: string
  status: 'queued' | 'processing' | 'done' | 'failed'
  rowsCount: number | null
  createdAt: string
  completedAt: string | null
}

export interface Alert {
  id: string
  name: string
  scope_type: string
  scope_id: string | null
  metric: string
  operator: string
  threshold_value: number
  frequency_minutes: number
  channels: string | null
  last_triggered_at: string | null
  enabled: number
  created_by: string | null
  created_at: string
}

export interface AnalyticsFilters {
  start: string
  end: string
  projectId?: string
  status?: string
  type?: string
  reviewerId?: string
  slaOverlay?: boolean
}
