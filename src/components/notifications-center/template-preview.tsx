import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const SAMPLE_VALUES: Record<string, string> = {
  decision_title: 'Material selection for Riverside Residence',
  deadline: 'March 15, 2025',
  client_name: 'Sarah Johnson',
  project_name: 'Riverside Residence',
}

function replacePlaceholders(text: string): string {
  return text.replace(/\{(\w+)\}/g, (_, key) => SAMPLE_VALUES[key] ?? `{${key}}`)
}

export interface TemplatePreviewProps {
  subject: string
  bodyHtml: string
  className?: string
}

export function TemplatePreview({ subject, bodyHtml, className }: TemplatePreviewProps) {
  const previewSubject = replacePlaceholders(subject)
  const previewBody = replacePlaceholders(bodyHtml)

  return (
    <Card className={cn('border-dashed', className)}>
      <CardHeader className="py-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Live preview
        </p>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        <div>
          <p className="text-xs text-muted-foreground">Subject:</p>
          <p className="text-sm font-medium">{previewSubject || '(empty)'}</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-xs text-muted-foreground mb-2">Body:</p>
          <div
            className="prose prose-sm max-w-none text-foreground"
            dangerouslySetInnerHTML={{
              __html: previewBody || '<p class="text-muted-foreground">(empty)</p>',
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}
