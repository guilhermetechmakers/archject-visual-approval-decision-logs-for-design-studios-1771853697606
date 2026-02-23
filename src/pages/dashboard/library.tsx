import { FileStack, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function LibraryPage() {

  return (
    <div className="space-y-8 animate-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Drawings & Specs</h1>
          <p className="mt-1 text-muted-foreground">Central file repository for this project</p>
        </div>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Upload files
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <FileStack className="h-16 w-16 text-muted-foreground" />
          <p className="mt-4 text-lg font-medium">No files yet</p>
          <p className="mt-2 max-w-md text-center text-muted-foreground">
            Upload drawings, specs, and other files. Attach them to decisions when creating approval cards.
          </p>
          <Button className="mt-6">
            <Upload className="mr-2 h-4 w-4" />
            Upload files
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
