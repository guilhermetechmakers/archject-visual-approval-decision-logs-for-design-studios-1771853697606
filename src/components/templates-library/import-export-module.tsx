import { useRef } from 'react'
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

export interface ImportExportModuleProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'import' | 'export'
  onImport?: (file: File) => Promise<{ imported: number; errors?: string[] }>
  onExport?: () => Promise<void>
  exportTemplateIds: string[]
  isProcessing?: boolean
}

export function ImportExportModule({
  open,
  onOpenChange,
  mode,
  onImport,
  onExport,
  exportTemplateIds,
  isProcessing = false,
}: ImportExportModuleProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onImport) return
    e.target.value = ''
    try {
      await onImport(file)
      onOpenChange(false)
    } catch {
      // Error handled by caller
    }
  }

  const handleExport = async () => {
    if (!onExport) return
    try {
      await onExport()
      onOpenChange(false)
    } catch {
      // Error handled by caller
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'import' ? 'Import templates' : 'Export templates'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'import'
              ? 'Import templates from a JSON file. The file can contain a single template or an array/templates property for multiple.'
              : `Export ${exportTemplateIds.length} template${exportTemplateIds.length !== 1 ? 's' : ''} to a JSON file for backup or sharing.`}
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
          {mode === 'import' ? (
            <button
              type="button"
              onClick={handleImportClick}
              disabled={isProcessing}
              className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-8 transition-colors hover:border-primary/50 hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <Upload className="h-12 w-12 text-muted-foreground" />
              <span className="font-medium">
                {isProcessing ? 'Importing...' : 'Select JSON file'}
              </span>
              <span className="text-sm text-muted-foreground">
                Single template or templates array
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleExport}
              disabled={isProcessing || exportTemplateIds.length === 0}
              className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-8 transition-colors hover:border-primary/50 hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <Download className="h-12 w-12 text-muted-foreground" />
              <span className="font-medium">
                {isProcessing ? 'Exporting...' : 'Download export'}
              </span>
              <span className="text-sm text-muted-foreground">
                {exportTemplateIds.length} template
                {exportTemplateIds.length !== 1 ? 's' : ''} selected
              </span>
            </button>
          )}
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex gap-2">
              <FileJson className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Supported format</p>
                <p>
                  JSON with name, type, content (defaultOptions), and optional tags.
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
