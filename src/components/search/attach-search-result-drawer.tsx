import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Link2 } from 'lucide-react'
import { api } from '@/lib/api'
import { attachSearchResult } from '@/api/search'
import type { SearchResultItem } from '@/types/search'
import { getDashboardProjects } from '@/api/dashboard'
import { toast } from 'sonner'

export interface AttachSearchResultDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: SearchResultItem | null
}

export function AttachSearchResultDrawer({
  open,
  onOpenChange,
  item,
}: AttachSearchResultDrawerProps) {
  const queryClient = useQueryClient()
  const [selectedDecisionId, setSelectedDecisionId] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')

  const { data: projectsData } = useQuery({
    queryKey: ['dashboard-projects', { pageSize: 100 }],
    queryFn: () => getDashboardProjects({ page: 1, pageSize: 100 }),
    enabled: open,
  })
  const projects = projectsData?.items ?? []

  const { data: decisions = [], isLoading } = useQuery({
    queryKey: ['decisions', selectedProjectId],
    queryFn: () => api.get<{ id: string; title: string; status: string }[]>(`/projects/${selectedProjectId}/decisions`),
    enabled: open && !!selectedProjectId,
  })

  const attachMutation = useMutation({
    mutationFn: () =>
      attachSearchResult(item!.id, 'decision', selectedDecisionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search'] })
      toast.success('Attached to decision')
      setSelectedDecisionId('')
      setSelectedProjectId('')
      onOpenChange(false)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Attach failed'),
  })

  const handleAttach = () => {
    if (!selectedDecisionId) {
      toast.error('Select a decision')
      return
    }
    attachMutation.mutate()
  }

  const handleProjectChange = (value: string) => {
    setSelectedProjectId(value)
    setSelectedDecisionId('')
  }

  if (!item) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md sm:max-w-lg">
        <SheetClose />
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Attach to decision
          </SheetTitle>
          <SheetDescription>
            Attach &quot;{item.title}&quot; to a decision
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Project</label>
            <select
              value={selectedProjectId}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              aria-label="Select project"
            >
              <option value="">Select project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Decision</label>
            {!selectedProjectId ? (
              <p className="text-sm text-muted-foreground">Select a project first</p>
            ) : isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <select
                value={selectedDecisionId}
                onChange={(e) => setSelectedDecisionId(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                aria-label="Select decision"
              >
                <option value="">Select decision...</option>
                {decisions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} ({d.status})
                  </option>
                ))}
              </select>
            )}
          </div>
          <Button
            className="w-full"
            onClick={handleAttach}
            disabled={!selectedDecisionId || attachMutation.isPending}
          >
            {attachMutation.isPending ? 'Attaching...' : 'Attach'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
