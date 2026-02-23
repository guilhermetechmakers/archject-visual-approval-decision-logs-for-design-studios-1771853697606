import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Share2,
  Plus,
  FileCheck,
  FileStack,
  LayoutTemplate,
  BarChart3,
  FileText,
  Settings,
  Users,
  Search,
  MoreHorizontal,
  Pencil,
  Archive,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { getLibraryFiles } from '@/api/library'
import { getProject, updateProject, deleteProject, restoreProject } from '@/api/projects'
import { getDecisions } from '@/api/decisions'
import { DecisionCard } from '@/components/decisions'
import { setLastProject } from '@/components/layout/sidebar'
import { toast } from 'sonner'

export function ProjectWorkspace() {
  const { projectId } = useParams<{ projectId: string }>()

  useEffect(() => {
    if (projectId) {
      setLastProject(projectId)
    }
  }, [projectId])
  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId!).catch(() => ({ id: projectId!, name: 'Project', description: '', status: 'active' as const })),
    enabled: !!projectId,
  })

  const { data: decisions = [], isLoading: decisionsLoading } = useQuery({
    queryKey: ['decisions', projectId],
    queryFn: () => getDecisions(projectId!),
    enabled: !!projectId,
  })

  const [decisionFilter, setDecisionFilter] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const updateMutation = useMutation({
    mutationFn: (payload: { name?: string; description?: string }) =>
      updateProject(projectId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      setEditOpen(false)
      toast.success('Project updated')
    },
    onError: (e: { message?: string }) => {
      toast.error(e?.message ?? 'Failed to update project')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteProject(projectId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Project archived')
      navigate('/dashboard/projects')
    },
    onError: (e: { message?: string }) => {
      toast.error(e?.message ?? 'Failed to archive project')
    },
  })

  const restoreMutation = useMutation({
    mutationFn: () => restoreProject(projectId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      toast.success('Project restored')
    },
    onError: (e: { message?: string }) => {
      toast.error(e?.message ?? 'Failed to restore project')
    },
  })

  const handleEditOpen = useCallback(() => {
    setEditName(project?.name ?? '')
    setEditDescription(project?.description ?? '')
    setEditOpen(true)
  }, [project])

  const handleEditSave = useCallback(() => {
    if (!editName.trim()) {
      toast.error('Project name is required')
      return
    }
    updateMutation.mutate({ name: editName.trim(), description: editDescription.trim() || undefined })
  }, [editName, editDescription, updateMutation])
  const filteredDecisions = decisionFilter
    ? decisions.filter(
        (d) =>
          d.title.toLowerCase().includes(decisionFilter.toLowerCase()) ||
          d.status.toLowerCase().includes(decisionFilter.toLowerCase())
      )
    : decisions

  const { data: libraryFiles = [] } = useQuery({
    queryKey: ['library-files', projectId, 'workspace'],
    queryFn: () => getLibraryFiles(projectId!, { includeArchived: false }),
    enabled: !!projectId,
  })

  const recentFiles = libraryFiles.slice(0, 4)

  return (
    <div className="space-y-8 animate-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <div>
            <nav className="text-sm text-muted-foreground">
              <Link to="/dashboard" className="hover:text-foreground">Dashboard</Link>
              <span className="mx-2">/</span>
              <Link to="/dashboard/projects" className="hover:text-foreground">Projects</Link>
              <span className="mx-2">/</span>
              <span className="text-foreground">{project?.name ?? 'Project'}</span>
            </nav>
            {isLoading ? (
              <Skeleton className="mt-2 h-8 w-64" />
            ) : (
              <h1 className="mt-2 text-2xl font-bold">{project?.name ?? 'Project'}</h1>
            )}
            {project?.description && (
              <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
            )}
          </div>
          {project && !isLoading && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Project options">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={handleEditOpen}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit project
                </DropdownMenuItem>
                {project.status === 'archived' ? (
                  <DropdownMenuItem
                    onClick={() => restoreMutation.mutate()}
                    disabled={restoreMutation.isPending}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Restore project
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                    className="text-destructive focus:text-destructive"
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Archive project
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div className="flex gap-2">
          <Link to={`/dashboard/projects/${projectId}/analytics`}>
            <Button variant="outline" size="sm">
              <BarChart3 className="mr-2 h-4 w-4" />
              Analytics
            </Button>
          </Link>
          <Button variant="outline" size="sm">
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Link to={`/dashboard/projects/${projectId}/decisions/new`}>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New decision
            </Button>
          </Link>
        </div>
      </div>

      {/* Two-column layout: Decision Cards (left) | Drawings, Templates, Settings (right) */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Decision Cards - left pane with visual previews */}
        <div className="lg:col-span-8">
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Decisions
              </CardTitle>
              <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <div className="relative flex-1 max-w-xs">
                  <Search
                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    placeholder="Filter decisions..."
                    value={decisionFilter}
                    onChange={(e) => setDecisionFilter(e.target.value)}
                    className="pl-9"
                    aria-label="Filter decisions by title or status"
                  />
                </div>
                <Link to={`/dashboard/projects/${projectId}/decisions/new`}>
                  <Button size="sm" variant="outline">Add</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {decisionsLoading ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-48 rounded-xl" />
                  ))}
                </div>
              ) : filteredDecisions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileCheck className="h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 font-medium">
                    {decisionFilter ? 'No matching decisions' : 'No decisions yet'}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {decisionFilter
                      ? 'Try adjusting your filter'
                      : 'Create a decision to get client approval'}
                  </p>
                  {decisionFilter ? (
                    <Button className="mt-4" onClick={() => setDecisionFilter('')}>
                      Clear filter
                    </Button>
                  ) : (
                    <Link
                      to={`/dashboard/projects/${projectId}/decisions/new`}
                      className="mt-4"
                    >
                      <Button>Create decision</Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {filteredDecisions.map((d) => (
                    <DecisionCard
                      key={d.id}
                      decision={d}
                      projectId={projectId!}
                      showActions
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right pane: Drawings/Specs, Templates, Project Settings */}
        <div className="lg:col-span-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileStack className="h-4 w-4" />
                Drawings & Specs
              </CardTitle>
              <Link to={`/dashboard/projects/${projectId}/library`}>
                <Button size="sm" variant="ghost" className="h-8 text-xs">
                  View all
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentFiles.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-4 text-center">
                  <p className="text-sm text-muted-foreground">No files yet</p>
                  <Link to={`/dashboard/projects/${projectId}/library`} className="mt-2 inline-block">
                    <Button variant="outline" size="sm">
                      Upload files
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {recentFiles.map((f) => (
                      <Link
                        key={f.id}
                        to={`/dashboard/projects/${projectId}/library`}
                        className="group flex flex-col overflow-hidden rounded-lg border border-border bg-muted/30 p-2 transition-all hover:border-primary/30 hover:shadow-sm"
                      >
                        <div className="aspect-square flex items-center justify-center rounded bg-muted">
                          {f.thumbnailUrl ? (
                            <img
                              src={f.thumbnailUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <FileText className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>
                        <p className="mt-1 truncate text-xs font-medium" title={f.filename}>
                          {f.filename}
                        </p>
                      </Link>
                    ))}
                  </div>
                  <Link to={`/dashboard/projects/${projectId}/library`}>
                    <Button variant="outline" size="sm" className="w-full">
                      View library
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <LayoutTemplate className="h-4 w-4" />
                Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link to={`/dashboard/projects/${projectId}/templates`}>
                <Button variant="outline" size="sm" className="w-full">
                  Browse templates
                </Button>
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link to={`/dashboard/projects/${projectId}/analytics`}>
                <Button variant="outline" size="sm" className="w-full">
                  View analytics
                </Button>
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Client sharing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-muted-foreground">
                Share decision links with clients for approval. Publish a decision to generate a secure, no-login client link.
              </p>
              <div className="flex flex-col gap-2">
                <Link to={`/dashboard/projects/${projectId}/decisions/new`}>
                  <Button variant="outline" size="sm" className="w-full">
                    <Share2 className="mr-2 h-4 w-4" />
                    Create & share decision
                  </Button>
                </Link>
                <p className="text-xs text-muted-foreground">
                  Client links are generated when you publish a decision. Each link is token-based and can be set to expire.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="h-4 w-4" />
                Project settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link to="/dashboard/settings">
                <Button variant="outline" size="sm" className="w-full">
                  Open settings
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit project</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="edit-name" className="text-sm font-medium">
                Project name
              </label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Project name"
                aria-label="Project name"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="edit-desc" className="text-sm font-medium">
                Description (optional)
              </label>
              <Input
                id="edit-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Brief description"
                aria-label="Project description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
