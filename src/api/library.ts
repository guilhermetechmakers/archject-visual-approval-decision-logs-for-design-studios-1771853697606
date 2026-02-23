import { api } from '@/lib/api'
import type { LibraryFile, LibraryFileVersion } from '@/types'

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

export interface LibraryFilesResponse {
  files: LibraryFile[]
}

export interface LibraryVersionsResponse {
  versions: LibraryFileVersion[]
}

export async function getLibraryFiles(
  projectId: string,
  params?: { search?: string; fileType?: string; includeArchived?: boolean; archived?: 'true' | 'false' | 'all' }
): Promise<LibraryFile[]> {
  const search = new URLSearchParams()
  if (params?.search) search.set('search', params.search)
  if (params?.fileType) search.set('fileType', params.fileType)
  if (params?.archived) search.set('archived', params.archived)
  else search.set('archived', params?.includeArchived ? 'all' : 'false')
  const qs = search.toString()
  const res = await api.get<LibraryFilesResponse>(
    `/projects/${projectId}/files${qs ? `?${qs}` : ''}`
  )
  return res.files
}

export async function uploadLibraryFile(
  projectId: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<LibraryFile> {
  const formData = new FormData()
  formData.append('file', file)

  const token = localStorage.getItem('auth_token')
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const xhr = new XMLHttpRequest()
  return new Promise((resolve, reject) => {
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    })
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as LibraryFile & { currentVersion: number }
          resolve({
            id: data.id,
            projectId,
            filename: data.filename,
            filepath: '',
            filetype: data.filetype ?? '',
            size: data.size ?? 0,
            uploadedAt: data.uploadedAt ?? new Date().toISOString(),
            currentVersion: data.currentVersion ?? 1,
            isArchived: false,
            thumbnailUrl: data.thumbnailUrl,
          })
        } catch {
          reject(new Error('Invalid response'))
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText) as { message?: string }
          reject(new Error(err.message ?? 'Upload failed'))
        } catch {
          reject(new Error('Upload failed'))
        }
      }
    })
    xhr.addEventListener('error', () => reject(new Error('Upload failed')))
    xhr.open('POST', `${API_BASE}/projects/${projectId}/files`)
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v))
    xhr.send(formData)
  })
}

export async function getLibraryFile(projectId: string, fileId: string): Promise<LibraryFile> {
  return api.get<LibraryFile>(`/projects/${projectId}/files/${fileId}`)
}

export async function archiveLibraryFile(
  projectId: string,
  fileId: string,
  isArchived: boolean
): Promise<void> {
  await api.put(`/projects/${projectId}/files/${fileId}`, { isArchived })
}

export async function deleteLibraryFile(projectId: string, fileId: string): Promise<void> {
  await api.delete(`/projects/${projectId}/files/${fileId}`)
}

export async function restoreLibraryFile(
  projectId: string,
  fileId: string
): Promise<{ id: string; restored: boolean }> {
  return api.post<{ id: string; restored: boolean }>(`/projects/${projectId}/files/${fileId}/restore`)
}

export async function getFileVersions(
  projectId: string,
  fileId: string
): Promise<LibraryFileVersion[]> {
  const res = await api.get<LibraryVersionsResponse>(
    `/projects/${projectId}/files/${fileId}/versions`
  )
  return res.versions
}

export async function uploadNewVersion(
  projectId: string,
  fileId: string,
  file: File,
  notes?: string
): Promise<{ id: string; versionNumber: number }> {
  const formData = new FormData()
  formData.append('file', file)
  if (notes) formData.append('notes', notes)

  const token = localStorage.getItem('auth_token')
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const response = await fetch(`${API_BASE}/projects/${projectId}/files/${fileId}/versions`, {
    method: 'POST',
    headers,
    body: formData,
    credentials: 'include',
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { message?: string }
    throw new Error(err.message ?? 'Upload failed')
  }
  return response.json()
}

export async function restoreFileVersion(
  projectId: string,
  fileId: string,
  versionId: string
): Promise<{ currentVersionId: string; versionNumber: number }> {
  return api.post(
    `/projects/${projectId}/files/${fileId}/versions/${versionId}/restore`
  )
}

export async function attachFileToDecision(
  projectId: string,
  fileId: string,
  decisionId: string,
  notes?: string
): Promise<{ attachmentId: string; attached: boolean }> {
  return api.post(`/projects/${projectId}/files/${fileId}/attach`, {
    decisionId,
    notes,
  })
}

export async function removeAttachmentFromDecision(
  projectId: string,
  decisionId: string,
  attachmentId: string
): Promise<{ removed: boolean }> {
  return api.delete<{ removed: boolean }>(
    `/projects/${projectId}/decisions/${decisionId}/attachments/${attachmentId}`
  )
}

export async function downloadLibraryFile(
  projectId: string,
  fileId: string,
  filename: string
): Promise<void> {
  const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
  const url = base ? `${base}/api/projects/${projectId}/files/${fileId}/download` : `/api/projects/${projectId}/files/${fileId}/download`
  const token = localStorage.getItem('auth_token')
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  })
  if (!res.ok) throw new Error('Download failed')
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

/** Returns a blob URL for inline preview (images, PDF). Caller must revoke the URL when done. */
export async function getFilePreviewBlobUrl(
  projectId: string,
  fileId: string
): Promise<string> {
  const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
  const url = base ? `${base}/api/projects/${projectId}/files/${fileId}/preview` : `/api/projects/${projectId}/files/${fileId}/preview`
  const token = localStorage.getItem('auth_token')
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  })
  if (!res.ok) throw new Error('Preview failed')
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}
