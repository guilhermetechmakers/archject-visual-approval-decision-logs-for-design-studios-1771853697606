import { useQuery } from '@tanstack/react-query'
import { Palette, FileSignature, Clock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { listBrandingProfiles } from '@/api/exports-decision-logs'
import { cn } from '@/lib/utils'

export interface ExportSettingsState {
  brandingProfileId: string
  signatureRequested: boolean
  timestampGranularity: 'second' | 'minute' | 'hour'
}

export interface ExportSettingsPanelProps {
  state: ExportSettingsState
  onStateChange: (state: ExportSettingsState) => void
}

export function ExportSettingsPanel({ state, onStateChange }: ExportSettingsPanelProps) {
  const { data: profiles = [] } = useQuery({
    queryKey: ['branding-profiles'],
    queryFn: listBrandingProfiles,
  })

  return (
    <Card className="card-hover">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Export settings
        </CardTitle>
        <CardDescription>
          Apply studio branding, signature block, and timestamp options to your export.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Branding profile */}
        <div className="space-y-2">
          <Label htmlFor="branding-profile">Branding profile</Label>
          <select
            id="branding-profile"
            value={state.brandingProfileId}
            onChange={(e) =>
              onStateChange({
                ...state,
                brandingProfileId: e.target.value,
              })
            }
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Select branding profile"
          >
            <option value="">Default (no branding)</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {profiles.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Configure branding in Settings → Branding
            </p>
          )}
        </div>

        {/* Signature block toggle */}
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <FileSignature className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Signed PDF</p>
              <p className="text-sm text-muted-foreground">
                Add digital signature block for legal use
              </p>
            </div>
          </div>
          <Switch
            checked={state.signatureRequested}
            onCheckedChange={(checked) =>
              onStateChange({
                ...state,
                signatureRequested: checked,
              })
            }
            aria-label="Request signed PDF"
          />
        </div>

        {/* Timestamp granularity */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Timestamp granularity
          </Label>
          <div className="flex gap-2">
            {(['second', 'minute', 'hour'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() =>
                  onStateChange({
                    ...state,
                    timestampGranularity: g,
                  })
                }
                className={cn(
                  'flex-1 rounded-lg border-2 px-3 py-2 text-sm font-medium capitalize transition-all',
                  state.timestampGranularity === g
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border hover:border-primary/50'
                )}
                aria-pressed={state.timestampGranularity === g}
              >
                {g}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            How precise timestamps appear in the audit log
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
