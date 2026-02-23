import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { TemplatePreview } from './template-preview'
import { useReminderTemplates, useUpdateReminderTemplate, notificationKeys } from '@/hooks/use-notifications'

const PLACEHOLDERS = [
  { value: 'decision_title', label: 'Decision title' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'client_name', label: 'Client name' },
  { value: 'project_name', label: 'Project name' },
]

export function TemplatesEditor() {
  const queryClient = useQueryClient()
  const { data: templates = [], isLoading } = useReminderTemplates()
  const updateMutation = useUpdateReminderTemplate()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [subject, setSubject] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [bodyText, setBodyText] = useState('')

  const selected = templates.find((t) => t.id === selectedId) ?? templates[0]
  const isDirty = selected && (
    subject !== selected.subject ||
    bodyHtml !== selected.bodyHtml ||
    bodyText !== selected.bodyText
  )

  useEffect(() => {
    if (selected) {
      setSubject(selected.subject)
      setBodyHtml(selected.bodyHtml)
      setBodyText(selected.bodyText)
    }
  }, [selected?.id])

  useEffect(() => {
    if (templates.length > 0 && !selectedId) {
      setSelectedId(templates[0].id)
    }
  }, [templates, selectedId])

  const handleSelect = (id: string) => {
    const t = templates.find((x) => x.id === id)
    if (t) {
      setSelectedId(id)
      setSubject(t.subject)
      setBodyHtml(t.bodyHtml)
      setBodyText(t.bodyText)
    }
  }

  const handleSave = () => {
    if (!selected) return
    updateMutation.mutate(
      {
        id: selected.id,
        payload: { subject, bodyHtml, bodyText },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: notificationKeys.templates() })
        },
      }
    )
  }

  const insertPlaceholder = (placeholder: string, field: 'subject' | 'bodyHtml' | 'bodyText') => {
    const token = `{${placeholder}}`
    if (field === 'subject') {
      setSubject((s) => s + token)
    } else if (field === 'bodyHtml') {
      setBodyHtml((b) => b + token)
    } else {
      setBodyText((b) => b + token)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-muted rounded" />
        <div className="h-24 bg-muted rounded" />
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No reminder templates found. Default templates will be created when available.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Template</Label>
        <Select
          value={selectedId ?? selected?.id ?? ''}
          onValueChange={handleSelect}
          options={templates.map((t) => ({ value: t.id, label: t.name }))}
          placeholder="Select template"
          aria-label="Select template"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="template-subject">Subject</Label>
        <Input
          id="template-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Reminder: Decision pending for {decision_title}"
          aria-label="Email subject"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="template-body">Body (HTML)</Label>
        <Textarea
          id="template-body"
          value={bodyHtml}
          onChange={(e) => setBodyHtml(e.target.value)}
          placeholder="<p>Hi {client_name},</p><p>Reminder: {decision_title} - Deadline: {deadline}</p>"
          rows={6}
          className="font-mono text-sm"
          aria-label="Email body"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-muted-foreground mr-2">Insert:</span>
        {PLACEHOLDERS.map((p) => (
          <Button
            key={p.value}
            variant="outline"
            size="sm"
            onClick={() => insertPlaceholder(p.value, 'bodyHtml')}
          >
            {`{${p.value}}`}
          </Button>
        ))}
      </div>
      <TemplatePreview subject={subject} bodyHtml={bodyHtml} />
      {isDirty && (
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? 'Saving...' : 'Save template'}
        </Button>
      )}
    </div>
  )
}
