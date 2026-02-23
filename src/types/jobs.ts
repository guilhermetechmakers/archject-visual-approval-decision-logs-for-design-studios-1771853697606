export type JobType = 'EXPORT_PDF' | 'EXPORT_CSV' | 'SIGNING' | 'UPLOAD' | 'GENERIC'

export type JobStatus = 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED'

export type StepStatus = 'pending' | 'in_progress' | 'completed' | 'failed'

export interface JobStep {
  name: string
  status: StepStatus
  started_at?: string | null
  finished_at?: string | null
  detail?: string | null
}

export interface ResultUrl {
  name: string
  url: string
  expires_at?: string
}

export interface JobError {
  code?: string
  message?: string
  trace_id?: string
}

export interface Job {
  id: string
  projectId: string | null
  userId: string
  type: JobType
  payload: Record<string, unknown> | null
  status: JobStatus
  cancellable: boolean
  progressPercent: number | null
  currentStep: string | null
  steps: JobStep[]
  resultUrls: ResultUrl[]
  error: JobError | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
  cancelledAt: string | null
}

export interface CreateJobPayload {
  type: JobType
  projectId?: string
  payload?: Record<string, unknown>
  cancellable?: boolean
}
