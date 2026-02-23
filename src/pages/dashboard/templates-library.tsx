import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  LayoutTemplate,
  Plus,
  ChevronRight,
  Upload,
  Download,
  LayoutGrid,
  List,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  archiveTemplate,
  deleteTemplate,
  duplicateTemplate,
  applyTemplate,
  importTemplatesFromFile,
  exportTemplates,
} from '@/api/templates'
import { getDashboardProjects } from '@/api/dashboard'
import {
  TemplatesFiltersBar,
  TemplateCard,
  TemplatePreviewDrawer,
  TemplateEditorModal,
  VersionHistoryPanel,
  ApplyTemplateModal,
  ImportExportModule,
} from '@/components/templates-library'
import type { TemplateLibraryItem, TemplateLibrary } from '@/types'
import { toast } from 'sonner'

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

export function TemplatesLibraryPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [archived, setArchived] = useState(false)
  const [scope, setScope] = useState<'my' | 'all'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null)
  const [editTemplate, setEditTemplate] = useState<TemplateLibraryItem | TemplateLibrary | null>(null)
  const [versionHistoryTemplateId, setVersionHistoryTemplateId] = useState<string | null>(null)
  const [applyTemplateItem, setApplyTemplateItem] = useState<TemplateLibraryItem | TemplateLibrary | null>(null)
  const [importExportMode, setImportExportMode] = useState<'import' | 'export' | null>(null)
  const [selectedExportIds, setSelectedExportIds] = useState<string[]>([])

  const debouncedSearch = useDebounce(search, 300)

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const res = await getDashboardProjects({ pageSize: 100 })
      const p = res.items.find((i) => i.id === projectId)
      return p ? { id: p.id, name: p.name } : projectId ? { id: projectId, name: 'Project' } : null
    },
    enabled: !!projectId,
  })

  const { data: templatesData, isLoading } = useQuery({
    queryKey: [
      'templates-library',
      projectId,
      debouncedSearch,
      type,
      archived,
      scope,
    ],
    queryFn: () =>
      getTemplates({
        projectId: projectId ?? undefined,
        q: debouncedSearch || undefined,
        type: (type || undefined) as import('@/types').TemplateType | undefined,
        archived: archived ? 'true' : 'false',
        scope,
      }),
  })

  const templates = templatesData?.items ?? []
  const total = templatesData?.total ?? 0

  const createMutation = useMutation({
    mutationFn: createTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates-library'] })
      toast.success('Template created')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to create'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateTemplate>[1] }) =>
      updateTemplate(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates-library'] })
      queryClient.invalidateQueries({ queryKey: ['template'] })
      toast.success('Template updated')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to update'),
  })

  const archiveMutation = useMutation({
    mutationFn: ({ id, isArchived }: { id: string; isArchived: boolean }) =>
      archiveTemplate(id, isArchived),
    onSuccess: (_, { isArchived }) => {
      queryClient.invalidateQueries({ queryKey: ['templates-library'] })
      toast.success(isArchived ? 'Template archived' : 'Template restored')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates-library'] })
      setPreviewTemplateId(null)
      toast.success('Template deleted')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to delete'),
  })

  const duplicateMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => duplicateTemplate(id, projectId ?? undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates-library'] })
      toast.success('Template duplicated')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to duplicate'),
  })

  const applyMutation = useMutation({
    mutationFn: ({ projectId: pid, templateId }: { projectId: string; templateId: string }) =>
      applyTemplate(pid, templateId),
    onSuccess: (_, { projectId: pid }) => {
      queryClient.invalidateQueries({ queryKey: ['templates-library'] })
      queryClient.invalidateQueries({ queryKey: ['decisions', pid] })
      setApplyTemplateItem(null)
      toast.success('Template applied to project')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to apply'),
  })

  const importMutation = useMutation({
    mutationFn: importTemplatesFromFile,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['templates-library'] })
      setImportExportMode(null)
      toast.success(`Imported ${res.imported} template(s)`)
      if (res.errors?.length) {
        res.errors.forEach((err) => toast.error(err))
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Import failed'),
  })

  const exportMutation = useMutation({
    mutationFn: () => exportTemplates(selectedExportIds),
    onSuccess: async (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `archject-templates-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(a.href)
      setImportExportMode(null)
      toast.success('Templates exported')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Export failed'),
  })

  const handleExport = useCallback(() => {
    if (selectedExportIds.length === 0) {
      setSelectedExportIds(templates.map((t) => t.id))
    }
    setImportExportMode('export')
  }, [templates])

  const projectName = project?.name ?? 'Project'

  return (
    <div className="space-y-8 animate-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/dashboard" className="hover:text-foreground">
              Dashboard
            </Link>
            <ChevronRight className="h-4 w-4" />
            {projectId ? (
              <>
                <Link to="/dashboard/projects" className="hover:text-foreground">
                  Projects
                </Link>
                <ChevronRight className="h-4 w-4" />
                <Link
                  to={`/dashboard/projects/${projectId}`}
                  className="hover:text-foreground"
                >
                  {projectName}
                </Link>
                <ChevronRight className="h-4 w-4" />
              </>
            ) : null}
            <span className="text-foreground">Templates Library</span>
          </nav>
          <h1 className="mt-2 text-2xl font-bold">Templates Library</h1>
          <p className="mt-1 text-muted-foreground">
            Browse, create, and apply decision templates to speed up project creation
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportExportMode('import')}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button
            size="sm"
            onClick={() => setEditTemplate(null)}
            className="transition-transform hover:scale-[1.02]"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create template
          </Button>
        </div>
      </div>

      {/* Filters */}
      <TemplatesFiltersBar
        search={search}
        onSearchChange={setSearch}
        type={type}
        onTypeChange={setType}
        archived={archived}
        onArchivedChange={setArchived}
        scope={scope}
        onScopeChange={setScope}
      />

      {/* View toggle & count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total} template{total !== 1 ? 's' : ''}
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
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <LayoutTemplate className="h-16 w-16 text-muted-foreground" />
            <p className="mt-4 text-lg font-medium">No templates yet</p>
            <p className="mt-2 max-w-md text-center text-muted-foreground">
              Create templates to speed up decision creation. Use them for materials, layouts,
              change requests, and more.
            </p>
            <Button
              className="mt-6 transition-transform hover:scale-[1.02]"
              onClick={() => setEditTemplate(null)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create your first template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              : 'space-y-2'
          }
        >
          {templates.map((template, i) => (
            <div
              key={template.id}
              className="animate-in-up"
              style={{ animationDelay: `${Math.min(i * 0.05, 0.3)}s` }}
            >
              <TemplateCard
                template={template}
                onPreview={(t) => setPreviewTemplateId(t.id)}
                onApply={(t) => setApplyTemplateItem(t)}
                onEdit={setEditTemplate}
                onDuplicate={(t) => duplicateMutation.mutate({ id: t.id })}
                onExport={(t) => {
                  setSelectedExportIds([t.id])
                  setImportExportMode('export')
                }}
                onArchive={(t) =>
                  archiveMutation.mutate({ id: t.id, isArchived: !t.isArchived })
                }
                onDelete={(t) => {
                  if (window.confirm('Delete this template? This cannot be undone.')) {
                    deleteMutation.mutate(t.id)
                  }
                }}
                projectId={projectId ?? null}
              />
            </div>
          ))}
        </div>
      )}

      {/* Modals & Drawers */}
      <TemplatePreviewDrawer
        open={!!previewTemplateId}
        onOpenChange={(open) => !open && setPreviewTemplateId(null)}
        templateId={previewTemplateId}
        onApply={(t) =>
          setApplyTemplateItem({
            ...t,
            description: t.description ?? '',
            projectId: t.projectId ?? null,
          } as TemplateLibraryItem)
        }
        onEdit={(t) =>
          setEditTemplate({
            ...t,
            description: t.description ?? '',
            projectId: t.projectId ?? null,
          } as TemplateLibraryItem)
        }
        onVersionHistory={(t) => setVersionHistoryTemplateId(t.id)}
        projectId={projectId ?? null}
      />

      <TemplateEditorModal
        open={editTemplate !== undefined}
        onOpenChange={(open) => !open && setEditTemplate(undefined as unknown as null)}
        template={editTemplate}
        onSubmit={async (values) => {
          const payload: import('@/api/templates').UpdateTemplatePayload = {
            name: values.name,
            description: values.description || undefined,
            type: values.type as import('@/types').TemplateType,
            content: editTemplate?.content
              ? (editTemplate.content as Record<string, unknown>)
              : undefined,
            tags: values.tags,
            versionNote: editTemplate ? values.versionNote : undefined,
          }
          if (editTemplate) {
            await updateMutation.mutateAsync({
              id: editTemplate.id,
              payload,
            })
          } else {
            await createMutation.mutateAsync(payload as import('@/api/templates').CreateTemplatePayload)
          }
        }}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <VersionHistoryPanel
        open={!!versionHistoryTemplateId}
        onClose={() => setVersionHistoryTemplateId(null)}
        templateId={versionHistoryTemplateId}
        templateName={templates.find((t) => t.id === versionHistoryTemplateId)?.name}
      />

      <ApplyTemplateModal
        open={!!applyTemplateItem}
        onOpenChange={(open) => !open && setApplyTemplateItem(null)}
        template={applyTemplateItem}
        projectId={projectId ?? null}
        onConfirm={async (targetProjectId) => {
          if (applyTemplateItem) {
            await applyMutation.mutateAsync({
              projectId: targetProjectId,
              templateId: applyTemplateItem.id,
            })
          }
        }}
        isSubmitting={applyMutation.isPending}
      />

      {importExportMode && (
        <ImportExportModule
          open={!!importExportMode}
          onOpenChange={(open) => !open && setImportExportMode(null)}
          mode={importExportMode}
          onImport={
            importExportMode === 'import'
              ? (file) => importMutation.mutateAsync(file)
              : undefined
          }
          onExport={
            importExportMode === 'export'
              ? async () => {
                  const ids =
                    selectedExportIds.length > 0 ? selectedExportIds : templates.map((t) => t.id)
                  const data = await exportTemplates(ids)
                  const blob = new Blob([JSON.stringify(data, null, 2)], {
                    type: 'application/json',
                  })
                  const a = document.createElement('a')
                  a.href = URL.createObjectURL(blob)
                  a.download = `archject-templates-${new Date().toISOString().slice(0, 10)}.json`
                  a.click()
                  URL.revokeObjectURL(a.href)
                }
              : undefined
          }
          exportTemplateIds={selectedExportIds.length > 0 ? selectedExportIds : templates.map((t) => t.id)}
          isProcessing={importMutation.isPending || exportMutation.isPending}
        />
      )}
    </div>
  )
}
