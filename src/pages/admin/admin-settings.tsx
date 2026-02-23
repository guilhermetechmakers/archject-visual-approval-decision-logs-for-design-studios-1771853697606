import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings } from 'lucide-react'

export function AdminSettingsPage() {
  return (
    <div className="space-y-8 animate-in">
      <div>
        <h1 className="text-2xl font-bold">Admin Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Platform configuration and admin preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuration
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Admin dashboard settings and preferences
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-muted-foreground">Settings configuration coming soon</p>
            <Button variant="outline" className="mt-4" disabled>
              Save changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
