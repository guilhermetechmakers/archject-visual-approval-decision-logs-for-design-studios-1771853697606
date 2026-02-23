import { useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileStack, LayoutGrid, List, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ThumbnailCard,
  UploadWidget,
  VersionHistoryModal,
  AttachToDecisionDrawer,
  FiltersPanel,
  FilePreviewPanel,
} from '@/components/library'
import {
  getLibraryFiles,
  uploadLibraryFile,
  archiveLibraryFile,
  deleteLibraryFile,
  downloadLibraryFile,
} from '@/api/library'
import { getDashboardProjects } from '@/api/dashboard'
import type { LibraryFile } from '@/types'
import { toast } from 'sonner'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  })
}

export function LibraryPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const queryClient = useQueryClient()
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [search, setSearch] = useState('')
  const [fileType, setFileType] = useState('')
  const [includeArchived, setIncludeArchived] = useState(false)
  const [versionModalFile, setVersionModalFile] = useState<LibraryFile | null>(null)
  const [attachDrawerFile, setAttachDrawerFile] = useState<LibraryFile | null>(null)
  const [previewFile, setPreviewFile] = useState<LibraryFile | null>(null)

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const res = await getDashboardProjects({ pageSize: 100 })
      const p = res.items.find((i) => i.id === projectId)
      return p ? { id: p.id, name: p.name } : { id: projectId!, name: 'Project' }
    },
    enabled: !!projectId,
  })

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['library-files', projectId, search, fileType, includeArchived],
    queryFn: () =>
      getLibraryFiles(projectId!, {
        search: search || undefined,
        fileType: fileType || undefined,
        includeArchived,
      }),
    enabled: !!projectId,
  })


  const archiveMutation = useMutation({
    mutationFn: ({ file, isArchived }: { file: LibraryFile; isArchived: boolean }) =>
      archiveLibraryFile(projectId!, file.id, isArchived),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-files', projectId] })
      toast.success('File archived')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Archive failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (file: LibraryFile) => deleteLibraryFile(projectId!, file.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-files', projectId] })
      toast.success('File deleted')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Delete failed'),
  })

  const handleUpload = useCallback(
    async (filesToUpload: File[], reportProgress?: (p: number) => void) => {
      const total = filesToUpload.length
      try {
        for (let i = 0; i < total; i++) {
          await uploadLibraryFile(projectId!, filesToUpload[i], (p) => {
            reportProgress?.(Math.round(((i + p / 100) / total) * 100))
          })
        }
        reportProgress?.(100)
        queryClient.invalidateQueries({ queryKey: ['library-files', projectId] })
        toast.success(`Uploaded ${total} file${total > 1 ? 's' : ''}`)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Upload failed')
        throw e
      }
    },
    [projectId, queryClient]
  )

  const handleDownload = useCallback(
    (file: LibraryFile) => {
      downloadLibraryFile(projectId!, file.id, file.filename).then(
        () => toast.success('Download started'),
        () => toast.error('Download failed')
      )
    },
    [projectId]
  )

  const handleArchive = useCallback(
    (file: LibraryFile) => archiveMutation.mutate({ file, isArchived: true }),
    [archiveMutation]
  )

  const projectName = project?.name ?? 'Project'

  return (
    <div className="space-y-8 animate-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/dashboard" className="hover:text-foreground">Dashboard</Link>
            <ChevronRight className="h-4 w-4" />
            <Link to={`/dashboard/projects/${projectId}`} className="hover:text-foreground">
              {projectName}
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">Drawings & Specs</span>
          </nav>
          <h1 className="mt-2 text-2xl font-bold">Drawings & Specs</h1>
          <p className="mt-1 text-muted-foreground">
            Central file repository for this project
          </p>
        </div>
      </div>

      {/* Upload */}
      <UploadWidget
        onUpload={handleUpload}
        disabled={!projectId}
      />

      {/* Filters */}
      <FiltersPanel
        search={search}
        onSearchChange={setSearch}
        fileType={fileType}
        onFileTypeChange={setFileType}
        includeArchived={includeArchived}
        onIncludeArchivedChange={setIncludeArchived}
        placeholder="Search files by name..."
      />

      {/* View toggle */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {files.length} file{files.length !== 1 ? 's' : ''}
        </p>
        <div className="flex gap-1">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('grid')}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('list')}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="aspect-[4/3] rounded-xl" />
          ))}
        </div>
      ) : files.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileStack className="h-16 w-16 text-muted-foreground" />
            <p className="mt-4 text-lg font-medium">No files yet</p>
            <p className="mt-2 max-w-md text-center text-muted-foreground">
              Upload drawings, specs, and other files. Attach them to decisions when creating
              approval cards.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Drag and drop above or use the upload area to get started.
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {files.map((file, i) => (
            <div
              key={file.id}
              className="animate-in-up"
              style={{ animationDelay: `${Math.min(i * 0.05, 0.3)}s` }}
            >
              <ThumbnailCard
                file={file}
                onVersionHistory={() => setVersionModalFile(file)}
                onAttachToDecision={() => setAttachDrawerFile(file)}
                onDownload={handleDownload}
                onArchive={handleArchive}
                onDelete={(f) => deleteMutation.mutate(f)}
                onPreview={() => setPreviewFile(file)}
              />
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((file) => (
                <TableRow key={file.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{file.filename}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {file.filetype.split('/').pop()?.toUpperCase() ?? '—'}
                  </TableCell>
                  <TableCell>{formatSize(file.size)}</TableCell>
                  <TableCell>v{file.currentVersion}</TableCell>
                  <TableCell>{formatDate(file.uploadedAt)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setVersionModalFile(file)}
                      >
                        History
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAttachDrawerFile(file)}
                      >
                        Attach
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(file)}
                      >
                        Download
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Modals */}
      <VersionHistoryModal
        open={!!versionModalFile}
        onClose={() => setVersionModalFile(null)}
        file={versionModalFile}
        projectId={projectId ?? ''}
      />
      <AttachToDecisionDrawer
        open={!!attachDrawerFile}
        onOpenChange={(open) => !open && setAttachDrawerFile(null)}
        file={attachDrawerFile}
        projectId={projectId ?? ''}
      />

      {previewFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="File preview"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <FilePreviewPanel
              file={previewFile}
              projectId={projectId ?? ''}
              onClose={() => setPreviewFile(null)}
              onDownload={() => handleDownload(previewFile)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
