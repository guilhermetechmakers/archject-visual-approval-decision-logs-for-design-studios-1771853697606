import { useState } from 'react'
import { Download } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useCreateExport } from '@/hooks/use-privacy'

interface PrivacyExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const FORMAT_OPTIONS = [
  { id: 'json', label: 'JSON (machine-readable)' },
  { id: 'csv', label: 'CSV (spreadsheet)' },
  { id: 'pdf', label: 'PDF (Decision Logs)' },
]

const INCLUDE_OPTIONS = [
  { id: 'decisions', label: 'Decisions & approvals' },
  { id: 'projects', label: 'Projects' },
  { id: 'comments', label: 'Comments' },
  { id: 'attachments', label: 'Attachments' },
]

export function PrivacyExportModal({ open, onOpenChange }: PrivacyExportModalProps) {
  const [formats, setFormats] = useState<string[]>(['json', 'csv', 'pdf'])
  const [include, setInclude] = useState<string[]>(['decisions', 'projects', 'comments', 'attachments'])
  const createExport = useCreateExport()

  const toggleFormat = (id: string) => {
    setFormats((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    )
  }

  const toggleInclude = (id: string) => {
    setInclude((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const handleSubmit = () => {
    if (formats.length === 0) return
    createExport.mutate(
      { formats, include },
      {
        onSuccess: () => {
          onOpenChange(false)
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClose={() => onOpenChange(false)}
        className="max-w-lg"
        aria-labelledby="export-modal-title"
        aria-describedby="export-modal-desc"
      >
        <DialogHeader>
          <DialogTitle id="export-modal-title">Request Account Export</DialogTitle>
          <DialogDescription id="export-modal-desc">
            We will prepare an archive of your data. Exports are typically ready within 24 hours. You will receive an email when it is available.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div>
            <h3 className="text-sm font-medium mb-3">Formats</h3>
            <div className="space-y-2">
              {FORMAT_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <Checkbox
                    checked={formats.includes(opt.id)}
                    onCheckedChange={() => toggleFormat(opt.id)}
                    aria-label={opt.label}
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-3">Include</h3>
            <div className="space-y-2">
              {INCLUDE_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <Checkbox
                    checked={include.includes(opt.id)}
                    onCheckedChange={() => toggleInclude(opt.id)}
                    aria-label={opt.label}
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Your export will be available for download for 72 hours. You can also view export history in Account Settings → Data.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={formats.length === 0 || createExport.isPending}
            className="gap-2"
          >
            {createExport.isPending ? (
              'Requesting...'
            ) : (
              <>
                <Download className="h-4 w-4" />
                Request Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
