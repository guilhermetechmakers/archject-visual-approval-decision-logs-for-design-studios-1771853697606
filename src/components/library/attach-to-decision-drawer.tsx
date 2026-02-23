import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
  SheetBody,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Link2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { attachFileToDecision } from '@/api/library'
import type { LibraryFile } from '@/types'
import type { Decision } from '@/types'
import { toast } from 'sonner'
import { useState } from 'react'

export interface AttachToDecisionDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: LibraryFile | null
  projectId: string
}

export function AttachToDecisionDrawer({
  open,
  onOpenChange,
  file,
  projectId,
}: AttachToDecisionDrawerProps) {
  const queryClient = useQueryClient()
  const [selectedDecisionId, setSelectedDecisionId] = useState<string>('')
  const [notes, setNotes] = useState('')

  const { data: decisions = [], isLoading } = useQuery({
    queryKey: ['decisions', projectId],
    queryFn: () => api.get<Decision[]>(`/projects/${projectId}/decisions`),
    enabled: open && !!projectId,
  })

  const attachMutation = useMutation({
    mutationFn: () =>
      attachFileToDecision(projectId, file!.id, selectedDecisionId, notes || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-files', projectId] })
      toast.success('File attached to decision')
      setSelectedDecisionId('')
      setNotes('')
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

  const statusVariant = (s: string) =>
    s === 'approved' ? 'success' : s === 'pending' ? 'warning' : 'secondary'

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
            {file?.filename}
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Select decision</Label>
              {isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : decisions.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                  No decisions in this project. Create one first.
                </p>
              ) : (
                <div className="space-y-2">
                  {decisions.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setSelectedDecisionId(d.id)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors',
                        selectedDecisionId === d.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50'
                      )}
                    >
                      <span className="font-medium">{d.title}</span>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          statusVariant(d.status) === 'success' && 'bg-success/20 text-success',
                          statusVariant(d.status) === 'warning' && 'bg-warning/20 text-warning',
                          statusVariant(d.status) === 'secondary' && 'bg-muted text-muted-foreground'
                        )}
                      >
                        {d.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="attach-notes">Notes (optional)</Label>
              <Textarea
                id="attach-notes"
                placeholder="Add context for this attachment..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleAttach}
                disabled={!selectedDecisionId || attachMutation.isPending || decisions.length === 0}
                className="flex-1"
              >
                {attachMutation.isPending ? (
                  <span className="animate-spin">⟳</span>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Attach
                  </>
                )}
              </Button>
            </div>
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}
