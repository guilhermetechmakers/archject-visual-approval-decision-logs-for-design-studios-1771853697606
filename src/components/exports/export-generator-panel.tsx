import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileText, FileSpreadsheet, Search } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { getDashboardProjects } from '@/api/dashboard'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

export interface ExportGeneratorState {
  projectId: string
  decisionIds: string[]
  format: 'PDF' | 'CSV'
  includeAttachments: boolean
}

interface DecisionItem {
  id: string
  title: string
  status: string
  projectId: string
}

export interface ExportGeneratorPanelProps {
  state: ExportGeneratorState
  onStateChange: (state: ExportGeneratorState) => void
  onSubmit: () => void
  isSubmitting?: boolean
}

export function ExportGeneratorPanel({
  state,
  onStateChange,
  onSubmit,
  isSubmitting = false,
}: ExportGeneratorPanelProps) {
  const [decisionSearch, setDecisionSearch] = useState('')

  const { data: projectsData } = useQuery({
    queryKey: ['dashboard-projects', { page: 1, pageSize: 50 }],
    queryFn: () => getDashboardProjects({ page: 1, pageSize: 50 }),
  })

  const { data: decisions = [], isLoading: decisionsLoading } = useQuery({
    queryKey: ['decisions', state.projectId],
    queryFn: () =>
      api.get<DecisionItem[]>(`/projects/${state.projectId}/decisions`) as Promise<DecisionItem[]>,
    enabled: !!state.projectId,
  })

  const projects = projectsData?.items ?? []
  const filteredDecisions = useMemo(() => {
    if (!decisionSearch.trim()) return decisions
    const q = decisionSearch.toLowerCase()
    return decisions.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.status.toLowerCase().includes(q)
    )
  }, [decisions, decisionSearch])

  const selectedCount = state.decisionIds.length
  const allSelected = decisions.length > 0 && selectedCount === decisions.length

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onStateChange({
        ...state,
        decisionIds: decisions.map((d) => d.id),
      })
    } else {
      onStateChange({ ...state, decisionIds: [] })
    }
  }

  const handleToggleDecision = (id: string, checked: boolean) => {
    if (checked) {
      onStateChange({
        ...state,
        decisionIds: state.decisionIds.includes(id) ? state.decisionIds : [...state.decisionIds, id],
      })
    } else {
      onStateChange({
        ...state,
        decisionIds: state.decisionIds.filter((x) => x !== id),
      })
    }
  }

  const canSubmit = state.projectId && state.decisionIds.length > 0

  return (
    <Card className="card-hover">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Export generator
        </CardTitle>
        <CardDescription>
          Select a project and decisions to export. Generate PDF or CSV Decision Logs with firm branding.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Project selector */}
        <div className="space-y-2">
          <label htmlFor="export-project" className="text-sm font-medium">
            Project
          </label>
          <select
            id="export-project"
            value={state.projectId}
            onChange={(e) =>
              onStateChange({
                ...state,
                projectId: e.target.value,
                decisionIds: [],
              })
            }
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Select project"
          >
            <option value="">Select a project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Decision multi-select */}
        {state.projectId && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Decisions</label>
              <span className="text-xs text-muted-foreground">
                {selectedCount} selected
              </span>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="mb-2 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search decisions..."
                    value={decisionSearch}
                    onChange={(e) => setDecisionSearch(e.target.value)}
                    className="pl-9 h-9"
                    aria-label="Search decisions"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSelectAll(!allSelected)}
                  aria-label={allSelected ? 'Deselect all' : 'Select all'}
                >
                  {allSelected ? 'Deselect all' : 'Select all'}
                </Button>
              </div>
              <div
                className="max-h-48 overflow-y-auto space-y-2"
                role="listbox"
                aria-label="Decision list"
              >
                {decisionsLoading ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Loading decisions...
                  </p>
                ) : filteredDecisions.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No decisions in this project
                  </p>
                ) : (
                  filteredDecisions.map((d) => {
                    const isChecked = state.decisionIds.includes(d.id)
                    return (
                      <label
                        key={d.id}
                        className={cn(
                          'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted/50',
                          isChecked && 'bg-primary/5'
                        )}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) =>
                            handleToggleDecision(d.id, !!checked)
                          }
                          aria-label={`Select ${d.title}`}
                        />
                        <span className="flex-1 truncate text-sm">{d.title}</span>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-xs font-medium',
                            d.status === 'approved' && 'bg-success/20 text-success',
                            d.status === 'pending' && 'bg-warning/20 text-warning',
                            d.status === 'draft' && 'bg-muted text-muted-foreground'
                          )}
                        >
                          {d.status}
                        </span>
                      </label>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Format selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Format</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onStateChange({ ...state, format: 'PDF' })}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all',
                state.format === 'PDF'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border hover:border-primary/50'
              )}
              aria-pressed={state.format === 'PDF'}
            >
              <FileText className="h-5 w-5" />
              PDF
            </button>
            <button
              type="button"
              onClick={() => onStateChange({ ...state, format: 'CSV' })}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all',
                state.format === 'CSV'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border hover:border-primary/50'
              )}
              aria-pressed={state.format === 'CSV'}
            >
              <FileSpreadsheet className="h-5 w-5" />
              CSV
            </button>
          </div>
        </div>

        {/* Include attachments toggle */}
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div>
            <p className="font-medium">Include attachments</p>
            <p className="text-sm text-muted-foreground">
              Attach referenced files to the export
            </p>
          </div>
          <Switch
            checked={state.includeAttachments}
            onCheckedChange={(checked) =>
              onStateChange({
                ...state,
                includeAttachments: checked,
              })
            }
            aria-label="Include attachments"
          />
        </div>

        <Button
          onClick={onSubmit}
          disabled={!canSubmit || isSubmitting}
          className="w-full btn-hover"
        >
          {isSubmitting ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Generating...
            </>
          ) : (
            'Generate export'
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
