import { Share2, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface ShareExportPanelProps {
  onShare?: () => void
  onExport?: () => void
  isExporting?: boolean
  className?: string
}

export function ShareExportPanel({
  onShare,
  onExport,
  isExporting,
  className,
}: ShareExportPanelProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {onShare && (
        <Button
          variant="outline"
          size="sm"
          onClick={onShare}
          className="border-[rgb(209,213,219)]"
        >
          <Share2 className="mr-2 h-4 w-4" />
          Share link
        </Button>
      )}
      {onExport && (
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={isExporting}
          className="border-[rgb(209,213,219)]"
        >
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export
        </Button>
      )}
    </div>
  )
}
