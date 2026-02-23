import { Download, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function ExportsPage() {
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
            <Button>
              <Download className="mr-2 h-4 w-4" />
              Export to PDF
            </Button>
            <Button variant="outline">
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
    </div>
  )
}
