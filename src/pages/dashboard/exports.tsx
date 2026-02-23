import { useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingOverlay } from '@/components/loading-overlay'
import { createJob } from '@/api/jobs'
import { toast } from 'sonner'

export function ExportsPage() {
  const [pdfJobId, setPdfJobId] = useState<string | null>(null)
  const [csvJobId, setCsvJobId] = useState<string | null>(null)

  const handleExportPdf = async () => {
    try {
      const { jobId } = await createJob({
        type: 'EXPORT_PDF',
        payload: { decisionIds: [] },
      })
      setPdfJobId(jobId)
    } catch {
      toast.error('Failed to start PDF export')
    }
  }

  const handleExportCsv = async () => {
    try {
      const { jobId } = await createJob({
        type: 'EXPORT_CSV',
        payload: { decisionIds: [] },
      })
      setCsvJobId(jobId)
    } catch {
      toast.error('Failed to start CSV export')
    }
  }

  return (
    <div className="space-y-8 animate-in">
      <div>
        <h1 className="text-2xl font-bold">Exports & Decision Logs</h1>
        <p className="mt-1 text-muted-foreground">Generate and download approval packs</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Export generator
          </CardTitle>
          <CardDescription>
            Create PDF or CSV Decision Logs with firm branding. Include signed options for legal-grade records.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button onClick={handleExportPdf}>
              <Download className="mr-2 h-4 w-4" />
              Export to PDF
            </Button>
            <Button variant="outline" onClick={handleExportCsv}>
              <Download className="mr-2 h-4 w-4" />
              Export to CSV
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Select a project and date range to include in the export. Large exports are processed in the background.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export history</CardTitle>
          <CardDescription>Recent exports and their status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 font-medium">No exports yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your export history will appear here
            </p>
          </div>
        </CardContent>
      </Card>

      <LoadingOverlay
        jobId={pdfJobId}
        operationName="Generating approval pack"
        subtitle="Compiling Decision Log — PDF export"
        open={!!pdfJobId}
        onOpenChange={(open) => !open && setPdfJobId(null)}
        onRetry={() => {
          setPdfJobId(null)
          handleExportPdf()
        }}
        exportsPagePath="/dashboard/exports"
      />

      <LoadingOverlay
        jobId={csvJobId}
        operationName="Generating CSV export"
        subtitle="Compiling Decision Log — CSV export"
        open={!!csvJobId}
        onOpenChange={(open) => !open && setCsvJobId(null)}
        onRetry={() => {
          setCsvJobId(null)
          handleExportCsv()
        }}
        exportsPagePath="/dashboard/exports"
      />
    </div>
  )
}
