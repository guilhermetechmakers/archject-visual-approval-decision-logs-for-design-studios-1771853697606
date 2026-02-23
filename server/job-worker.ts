import crypto from 'crypto'
import { db } from './db.js'

function getJobRow(jobId: string) {
  return db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as {
    id: string
    status: string
    cancellable: number
    type: string
    payload: string | null
    steps: string | null
  } | undefined
}

function updateJob(
  jobId: string,
  updates: {
    status?: string
    progress_percent?: number
    current_step?: string
    steps?: string
    result_urls?: string
    error?: string
    completed_at?: string
  }
) {
  const now = new Date().toISOString()
  const fields: string[] = ['updated_at = ?']
  const values: (string | number)[] = [now]

  if (updates.status !== undefined) {
    fields.push('status = ?')
    values.push(updates.status)
  }
  if (updates.progress_percent !== undefined) {
    fields.push('progress_percent = ?')
    values.push(updates.progress_percent)
  }
  if (updates.current_step !== undefined) {
    fields.push('current_step = ?')
    values.push(updates.current_step)
  }
  if (updates.steps !== undefined) {
    fields.push('steps = ?')
    values.push(updates.steps)
  }
  if (updates.result_urls !== undefined) {
    fields.push('result_urls = ?')
    values.push(updates.result_urls)
  }
  if (updates.error !== undefined) {
    fields.push('error = ?')
    values.push(updates.error)
  }
  if (updates.completed_at !== undefined) {
    fields.push('completed_at = ?')
    values.push(updates.completed_at)
  }

  values.push(jobId)
  db.prepare(`UPDATE jobs SET ${fields.join(', ')} WHERE id = ?`).run(...values)
}

function logJobHistory(jobId: string, actor: 'SYSTEM' | 'USER', action: string, detail?: Record<string, unknown>) {
  const id = crypto.randomUUID()
  db.prepare(
    'INSERT INTO job_history (id, job_id, actor, action, detail) VALUES (?, ?, ?, ?, ?)'
  ).run(id, jobId, actor, action, detail ? JSON.stringify(detail) : null)
}

function updateStep(steps: { name: string; status: string; started_at: string | null; finished_at: string | null; detail: string | null }[], index: number, status: 'in_progress' | 'completed') {
  const now = new Date().toISOString()
  const s = [...steps]
  if (s[index]) {
    s[index] = { ...s[index], status }
    if (status === 'in_progress') s[index].started_at = now
    if (status === 'completed') s[index].finished_at = now
  }
  return s
}

export function runJobWorker(jobId: string) {
  setImmediate(() => processJob(jobId))
}

async function processJob(jobId: string) {
  const row = getJobRow(jobId)
  if (!row || row.status !== 'QUEUED') return

  updateJob(jobId, { status: 'IN_PROGRESS', progress_percent: 0, current_step: 'Preparing' })
  logJobHistory(jobId, 'SYSTEM', 'started')

  let steps = row.steps ? JSON.parse(row.steps) : []
  steps = updateStep(steps, 0, 'completed')
  steps = updateStep(steps, 1, 'in_progress')
  updateJob(jobId, { steps: JSON.stringify(steps), progress_percent: 10 })

  await delay(500)

  if (getJobRow(jobId)?.status === 'CANCELLED') return

  steps = updateStep(steps, 1, 'completed')
  steps = updateStep(steps, 2, 'in_progress')
  updateJob(jobId, { current_step: 'Generating', steps: JSON.stringify(steps), progress_percent: 30 })

  await delay(800)

  if (getJobRow(jobId)?.status === 'CANCELLED') return

  const payload = row.payload ? JSON.parse(row.payload) : {}
  const decisionIds = payload.decisionIds || []
  const pageCount = Math.max(1, decisionIds.length * 2)

  steps = updateStep(steps, 2, 'completed')
  steps = updateStep(steps, 3, 'in_progress')
  updateJob(jobId, { current_step: 'Signing', steps: JSON.stringify(steps), progress_percent: 60 })

  await delay(600)

  if (getJobRow(jobId)?.status === 'CANCELLED') return

  steps = updateStep(steps, 3, 'completed')
  steps = updateStep(steps, 4, 'in_progress')
  updateJob(jobId, { current_step: 'Packaging', steps: JSON.stringify(steps), progress_percent: 85 })

  await delay(400)

  if (getJobRow(jobId)?.status === 'CANCELLED') return

  const ext = row.type === 'EXPORT_CSV' ? 'csv' : 'pdf'
  const resultUrls = [
    {
      name: `decision-log-${jobId.slice(0, 8)}.${ext}`,
      url: `/api/jobs/${jobId}/download?file=0`,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
  ]

  steps = updateStep(steps, 4, 'completed')
  steps = updateStep(steps, 5, 'completed')
  const now = new Date().toISOString()

  updateJob(jobId, {
    status: 'COMPLETED',
    progress_percent: 100,
    current_step: 'Ready',
    steps: JSON.stringify(steps),
    result_urls: JSON.stringify(resultUrls),
    completed_at: now,
  })

  logJobHistory(jobId, 'SYSTEM', 'completed', { resultCount: resultUrls.length })
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
