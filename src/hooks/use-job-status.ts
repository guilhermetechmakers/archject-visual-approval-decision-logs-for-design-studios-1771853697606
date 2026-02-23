import { useState, useEffect, useCallback } from 'react'
import {
  getJobStatus,
  cancelJob as cancelJobApi,
  getJobStreamUrl,
} from '@/api/jobs'
import type { Job, JobStatus } from '@/types/jobs'

const POLL_INTERVAL_MS = 2000
const MAX_BACKOFF_MS = 30000
const TERMINAL_STATUSES: JobStatus[] = ['COMPLETED', 'FAILED', 'CANCELLED']

export interface UseJobStatusOptions {
  /** Use SSE stream when available; fallback to polling */
  useSSE?: boolean
  /** Callback when job completes successfully */
  onComplete?: (job: Job) => void
  /** Callback when job fails */
  onError?: (job: Job) => void
  /** Callback when job is cancelled */
  onCancel?: (job: Job) => void
}

export interface UseJobStatusResult {
  state: JobStatus | null
  percent: number | null
  step: string | null
  message: string
  resultUrls: Job['resultUrls']
  error: Job['error']
  job: Job | null
  isLoading: boolean
  cancel: () => Promise<void>
}

export function useJobStatus(
  jobId: string | null,
  options: UseJobStatusOptions = {}
): UseJobStatusResult {
  const { useSSE = true, onComplete, onError, onCancel } = options
  const [job, setJob] = useState<Job | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pollBackoff, setPollBackoff] = useState(POLL_INTERVAL_MS)

  const fetchJob = useCallback(async () => {
    if (!jobId) return null
    try {
      const { job: j } = await getJobStatus(jobId)
      setJob(j)
      return j
    } catch {
      return null
    } finally {
      setIsLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    if (!jobId) {
      setJob(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    let sse: EventSource | null = null
    let pollTimer: ReturnType<typeof setTimeout> | null = null

    const trySSE = () => {
      try {
        const url = getJobStreamUrl(jobId!)
        sse = new EventSource(url)
        sse.onmessage = (e) => {
          const data = JSON.parse(e.data)
          setJob((prev) => {
            const base = prev ?? {
              id: jobId!,
              projectId: null,
              userId: '',
              type: 'GENERIC',
              payload: null,
              status: 'QUEUED' as const,
              cancellable: true,
              progressPercent: 0,
              currentStep: null,
              steps: [],
              resultUrls: [],
              error: null,
              createdAt: '',
              updatedAt: '',
              completedAt: null,
              cancelledAt: null,
            }
            const next: Job = {
              ...base,
              status: data.status ?? base.status,
              progressPercent: data.progress_percent ?? base.progressPercent,
              currentStep: data.current_step ?? base.currentStep,
              steps: data.steps ?? base.steps,
              resultUrls: data.result_urls ?? base.resultUrls,
              error: data.error ?? base.error,
            }
            return next
          })
          if (TERMINAL_STATUSES.includes(data.status)) {
            sse?.close()
          }
        }
        sse.onerror = () => {
          sse?.close()
          startPolling()
        }
      } catch {
        startPolling()
      }
    }

    const startPolling = () => {
      const poll = async () => {
        const j = await fetchJob()
        if (j && TERMINAL_STATUSES.includes(j.status)) {
          if (pollTimer) clearTimeout(pollTimer)
          return
        }
        pollTimer = setTimeout(poll, Math.min(pollBackoff, MAX_BACKOFF_MS))
        setPollBackoff((b) => Math.min(b * 1.5, MAX_BACKOFF_MS))
      }
      poll()
    }

    fetchJob().then((j) => {
      if (j && TERMINAL_STATUSES.includes(j.status)) return
      if (useSSE) {
        try {
          trySSE()
        } catch {
          startPolling()
        }
      } else {
        startPolling()
      }
    })

    return () => {
      sse?.close()
      if (pollTimer) clearTimeout(pollTimer)
    }
  }, [jobId, useSSE, fetchJob, pollBackoff])

  useEffect(() => {
    if (!job) return
    if (job.status === 'COMPLETED') onComplete?.(job)
    if (job.status === 'FAILED') onError?.(job)
    if (job.status === 'CANCELLED') onCancel?.(job)
  }, [job?.status, job, onComplete, onError, onCancel])

  const cancel = useCallback(async () => {
    if (!jobId || !job?.cancellable) return
    try {
      const { job: updated } = await cancelJobApi(jobId)
      setJob((prev) => (prev ? { ...prev, ...updated } : null))
    } catch {
      // ignore
    }
  }, [jobId, job?.cancellable])

  const message =
    job?.status === 'QUEUED'
      ? 'Waiting to start…'
      : job?.status === 'IN_PROGRESS'
        ? job.currentStep || 'Processing…'
        : job?.status === 'COMPLETED'
          ? 'Complete'
          : job?.status === 'FAILED'
            ? job.error?.message || 'Operation failed'
            : job?.status === 'CANCELLED'
              ? 'Operation canceled'
              : ''

  return {
    state: job?.status ?? null,
    percent: job?.progressPercent ?? null,
    step: job?.currentStep ?? null,
    message,
    resultUrls: job?.resultUrls ?? [],
    error: job?.error ?? null,
    job,
    isLoading,
    cancel,
  }
}

