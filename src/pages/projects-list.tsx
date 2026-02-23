import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FolderKanban, Plus, Trash2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import {
  getProjects,
  createProject,
  deleteProject,
  restoreProject,
  type ProjectListItem,
} from '@/api/projects'
import { toast } from 'sonner'

export function ProjectsListPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [includeDeleted, setIncludeDeleted] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-projects', search, includeDeleted],
    queryFn: () =>
      getProjects({
        search: search || undefined,
        includeDeleted,
        pageSize: 50,
      }),
  })

  const createMutation = useMutation({
    mutationFn: (payload: { name: string }) => createProject({ name: payload.name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-projects'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setNewProjectName('')
      setShowCreateForm(false)
      toast.success('Project created')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to create project'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-projects'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Project archived')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to delete'),
  })

  const restoreMutation = useMutation({
    mutationFn: restoreProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Project restored')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to restore'),
  })

  const projects: ProjectListItem[] = data?.items ?? []
  const handleCreate = () => {
    const name = newProjectName.trim()
    if (!name) {
      toast.error('Project name is required')
      return
    }
    createMutation.mutate({ name })
  }

  return (
    <div className="space-y-8 animate-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="mt-1 text-muted-foreground">Manage your design projects</p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
            aria-label="Search projects"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIncludeDeleted(!includeDeleted)}
          >
            {includeDeleted ? 'Hide deleted' : 'Show deleted'}
          </Button>
          <Button
            size="sm"
            onClick={() => setShowCreateForm(true)}
            className="transition-transform hover:scale-[1.02]"
          >
            <Plus className="mr-2 h-4 w-4" />
            New project
          </Button>
        </div>
      </div>

      {showCreateForm && (
        <Card className="border-primary/30">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="new-project-name" className="mb-2 block text-sm font-medium">
                Project name
              </label>
              <Input
                id="new-project-name"
                placeholder="Enter project name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                aria-label="Project name"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false)
                  setNewProjectName('')
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!newProjectName.trim() || createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderKanban className="h-16 w-16 text-muted-foreground" />
            <p className="mt-4 text-lg font-medium">No projects yet</p>
            <p className="mt-2 max-w-md text-center text-muted-foreground">
              Create your first project to start managing decisions and approvals.
            </p>
            <Button
              className="mt-6 transition-transform hover:scale-[1.02]"
              onClick={() => setShowCreateForm(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Card
              key={p.id}
              className={`card-hover h-full transition-all duration-200 ${
                p.status === 'archived' ? 'opacity-70' : ''
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <FolderKanban className="h-10 w-10 shrink-0 text-primary" />
                {p.status === 'archived' ? (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => restoreMutation.mutate(p.id)}
                      disabled={restoreMutation.isPending}
                      aria-label="Restore project"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault()
                        if (window.confirm('Delete this project? You can restore it later.')) {
                          deleteMutation.mutate(p.id)
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      aria-label="Delete project"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  )}
                </div>
                {p.status === 'archived' ? (
                  <h3 className="mt-4 font-semibold text-muted-foreground">{p.name}</h3>
                ) : (
                  <Link to={`/dashboard/projects/${p.id}`}>
                    <h3 className="mt-4 font-semibold hover:text-primary">{p.name}</h3>
                  </Link>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant={p.status === 'deleted' ? 'secondary' : 'default'}>
                    {p.status}
                  </Badge>
                  {(p.pendingApprovals ?? 0) > 0 && p.status !== 'deleted' ? (
                    <Badge variant="warning">{(p.pendingApprovals ?? p.pendingApprovalsCount ?? 0)} pending</Badge>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
