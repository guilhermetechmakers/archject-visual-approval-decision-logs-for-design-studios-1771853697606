import { useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Upload, Download, FileJson } from 'lucide-react'
import { toast } from 'sonner'

export interface ImportExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (file: File) => Promise<{ imported: number; errors?: string[] }>
  onExport: (ids: string[]) => Promise<Blob>
  selectedIds: string[]
}

export function ImportExportModal({
  open,
  onOpenChange,
  onImport,
  onExport,
  selectedIds,
}: ImportExportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setImporting(true)
    try {
      const result = await onImport(file)
      toast.success(`Imported ${result.imported} template${result.imported !== 1 ? 's' : ''}`)
      if (result.errors?.length) {
        result.errors.forEach((err) => toast.error(err))
      }
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const handleExport = async () => {
    if (selectedIds.length === 0) {
      toast.error('Select at least one template to export')
      return
    }
    setExporting(true)
    try {
      const blob = await onExport(selectedIds)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'templates-export.json'
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Export started')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import / Export templates</DialogTitle>
          <DialogDescription>
            Import templates from a JSON file or export selected templates for backup or
            sharing.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
            aria-hidden
          />
          <div className="flex flex-col gap-4 sm:flex-row">
            <button
              type="button"
              onClick={handleImportClick}
              disabled={importing}
              className="flex flex-1 flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-6 transition-colors hover:border-primary/50 hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <Upload className="h-10 w-10 text-muted-foreground" />
              <span className="font-medium">Import from file</span>
              <span className="text-sm text-muted-foreground">
                {importing ? 'Importing...' : 'JSON format'}
              </span>
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting || selectedIds.length === 0}
              className="flex flex-1 flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-6 transition-colors hover:border-primary/50 hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <Download className="h-10 w-10 text-muted-foreground" />
              <span className="font-medium">Export selected</span>
              <span className="text-sm text-muted-foreground">
                {exporting
                  ? 'Exporting...'
                  : `${selectedIds.length} template${selectedIds.length !== 1 ? 's' : ''} selected`}
              </span>
            </button>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex gap-2">
              <FileJson className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Supported format</p>
                <p>
                  JSON file with a single template object or an array/templates property
                  for multiple templates.
                </p>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
