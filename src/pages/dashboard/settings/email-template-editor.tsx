import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Mail, Eye } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { getEmailTemplates, updateEmailTemplate, type EmailTemplate } from '@/api/studios'
import { toast } from 'sonner'

const TEMPLATE_VARIABLES = [
  { key: '{{studio_name}}', desc: 'Studio name' },
  { key: '{{user_name}}', desc: 'Recipient name' },
  { key: '{{decision_title}}', desc: 'Decision title' },
  { key: '{{client_link}}', desc: 'Client approval link' },
]

const TEMPLATE_LABELS: Record<string, string> = {
  invite: 'Invite email',
  decision_ready: 'Decision ready for review',
}

function VariableChip({ variable, onInsert }: { variable: { key: string; desc: string }; onInsert: () => void }) {
  return (
    <button
      type="button"
      onClick={onInsert}
      className="rounded-md border border-border bg-muted/50 px-2 py-1 text-xs font-mono hover:bg-muted transition-colors"
      title={variable.desc}
    >
      {variable.key}
    </button>
  )
}

export function EmailTemplateEditor() {
  const queryClient = useQueryClient()
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null)
  const [editing, setEditing] = useState<EmailTemplate | null>(null)
  const [editSubject, setEditSubject] = useState('')
  const [editBody, setEditBody] = useState('')

  const { data: templates, isLoading } = useQuery({
    queryKey: ['studio', 'default', 'email-templates'],
    queryFn: () => getEmailTemplates('default'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ key, subject, body }: { key: string; subject: string; body: string }) =>
      updateEmailTemplate('default', key, { subject, body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio', 'default', 'email-templates'] })
      toast.success('Template saved')
      setEditing(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleSave = () => {
    if (!editing) return
    updateMutation.mutate({
      key: editing.templateKey,
      subject: editSubject,
      body: editBody,
    })
  }

  const handleOpenEdit = (t: EmailTemplate) => {
    setEditing(t)
    setEditSubject(t.subject)
    setEditBody(t.body)
  }

  const insertVariable = (variable: string, target: 'subject' | 'body') => {
    if (target === 'subject') {
      setEditSubject((s) => s + variable)
    } else {
      setEditBody((b) => b + variable)
    }
  }

  const previewContent = (subject: string, body: string) => {
    return {
      subject: subject
        .replace(/\{\{studio_name\}\}/g, 'Acme Design Studio')
        .replace(/\{\{user_name\}\}/g, 'Jane Doe')
        .replace(/\{\{decision_title\}\}/g, 'Kitchen Finishes')
        .replace(/\{\{client_link\}\}/g, 'https://app.archject.com/client/xxx'),
      body: body
        .replace(/\{\{studio_name\}\}/g, 'Acme Design Studio')
        .replace(/\{\{user_name\}\}/g, 'Jane Doe')
        .replace(/\{\{decision_title\}\}/g, 'Kitchen Finishes')
        .replace(/\{\{client_link\}\}/g, 'https://app.archject.com/client/xxx'),
    }
  }

  if (isLoading || !templates) {
    return (
      <Card className="card-hover">
        <CardHeader>
          <CardTitle>Email templates</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-32 animate-pulse rounded-lg bg-muted" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email templates
          </CardTitle>
          <CardDescription>
            Customize email templates for invites and notifications. Use variables for dynamic content.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Variables</p>
            <div className="flex flex-wrap gap-2">
              {TEMPLATE_VARIABLES.map((v) => (
                <VariableChip key={v.key} variable={v} onInsert={() => {}} />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {templates.map((t) => (
              <div
                key={t.templateKey}
                className="flex items-center justify-between rounded-lg border border-border p-4"
              >
                <div>
                  <p className="font-medium">{TEMPLATE_LABELS[t.templateKey] ?? t.templateKey}</p>
                  <p className="text-sm text-muted-foreground truncate max-w-md">{t.subject}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewTemplate({ ...t })}
                  >
                    <Eye className="mr-1 h-4 w-4" />
                    Preview
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleOpenEdit(t)}>
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent onClose={() => setEditing(null)} className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Edit {editing?.templateKey ? TEMPLATE_LABELS[editing.templateKey] ?? editing.templateKey : ''}
            </DialogTitle>
            <DialogDescription>
              Use variables for dynamic content. Variables appear in the panel to the right.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  placeholder="Email subject"
                />
                <div className="flex flex-wrap gap-1">
                  {TEMPLATE_VARIABLES.map((v) => (
                    <VariableChip
                      key={v.key}
                      variable={v}
                      onInsert={() => insertVariable(v.key, 'subject')}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Body</Label>
                <Textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  placeholder="Email body (plain text or Markdown)"
                  rows={10}
                  className="font-mono text-sm"
                />
                <div className="flex flex-wrap gap-1">
                  {TEMPLATE_VARIABLES.map((v) => (
                    <VariableChip
                      key={v.key}
                      variable={v}
                      onInsert={() => insertVariable(v.key, 'body')}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              Save template
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewTemplate} onOpenChange={(o) => !o && setPreviewTemplate(null)}>
        <DialogContent onClose={() => setPreviewTemplate(null)} className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
            <DialogDescription>
              Simulated email with sample variable values
            </DialogDescription>
          </DialogHeader>
          {previewTemplate && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Subject</p>
                <p className="mt-1 font-medium">
                  {previewContent(previewTemplate.subject, previewTemplate.body).subject}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Body</p>
                <pre className="mt-1 whitespace-pre-wrap text-sm font-sans">
                  {previewContent(previewTemplate.subject, previewTemplate.body).body}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
