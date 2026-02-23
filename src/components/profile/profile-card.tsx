import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Mail, Building2, Globe, Languages, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AvatarUploader } from './avatar-uploader'
import type { UserProfile } from '@/api/users'
import { updateProfile } from '@/api/users'

const schema = z.object({
  first_name: z.string().min(1, 'Required').max(100, 'Max 100 characters'),
  last_name: z.string().min(1, 'Required').max(100, 'Max 100 characters'),
  company: z.string().max(200).optional(),
  timezone: z.string().max(64).optional(),
  locale: z.string().max(16).optional(),
})

type FormData = z.infer<typeof schema>

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern (US)' },
  { value: 'America/Chicago', label: 'Central (US)' },
  { value: 'America/Denver', label: 'Mountain (US)' },
  { value: 'America/Los_Angeles', label: 'Pacific (US)' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Shanghai', label: 'Shanghai' },
  { value: 'Australia/Sydney', label: 'Sydney' },
]

const LOCALES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'ja', label: 'Japanese' },
]

interface ProfileCardProps {
  profile: UserProfile
  onUpdate: () => void
}

export function ProfileCard({ profile, onUpdate }: ProfileCardProps) {
  const [editing, setEditing] = useState(false)
  const [avatarModalOpen, setAvatarModalOpen] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    values: {
      first_name: profile.first_name,
      last_name: profile.last_name,
      company: profile.company ?? '',
      timezone: profile.timezone ?? 'UTC',
      locale: profile.locale ?? 'en',
    },
  })

  const onSubmit = form.handleSubmit(async (data) => {
    await updateProfile({
      first_name: data.first_name,
      last_name: data.last_name,
      company: data.company || undefined,
      timezone: data.timezone || undefined,
      locale: data.locale || undefined,
    })
    onUpdate()
    setEditing(false)
  })

  const avatarUrl = profile.avatar_url
  const displayName = `${profile.first_name} ${profile.last_name}`.trim() || profile.email

  return (
    <>
      <Card
        className="card-hover scroll-mt-8 transition-all duration-200"
      >
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile
              </CardTitle>
              <CardDescription>Your account details and preferences</CardDescription>
            </div>
            {profile.two_fa_enabled && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success"
                title="Two-factor authentication is enabled"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
                2FA enabled
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <button
              type="button"
              onClick={() => setAvatarModalOpen(true)}
              className="group relative shrink-0 self-start focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full"
              aria-label="Change profile picture"
            >
              <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-border bg-muted ring-offset-2 transition-all duration-200 group-hover:border-primary/50 group-hover:shadow-md">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <User className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <Pencil className="h-6 w-6 text-white" />
              </span>
            </button>

            <div className="min-w-0 flex-1 space-y-4">
              {!editing ? (
                <>
                  <div>
                    <p className="text-lg font-semibold">{displayName}</p>
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {profile.email}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Role:</span> {profile.role}
                    </p>
                    {profile.company && (
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="h-4 w-4" />
                        {profile.company}
                      </p>
                    )}
                    {(profile.timezone || profile.locale) && (
                      <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                        {profile.timezone && (
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {profile.timezone}
                          </span>
                        )}
                        {profile.locale && (
                          <span className="flex items-center gap-1">
                            <Languages className="h-3 w-3" />
                            {profile.locale}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit profile
                  </Button>
                </>
              ) : (
                <form onSubmit={onSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First name</Label>
                      <Input id="first_name" {...form.register('first_name')} />
                      {form.formState.errors.first_name && (
                        <p className="text-sm text-destructive">{form.formState.errors.first_name.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last name</Label>
                      <Input id="last_name" {...form.register('last_name')} />
                      {form.formState.errors.last_name && (
                        <p className="text-sm text-destructive">{form.formState.errors.last_name.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </Label>
                    <Input value={profile.email} disabled className="bg-muted" />
                    <p className="text-xs text-muted-foreground">Contact support to change email.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company" className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Studio / Company
                    </Label>
                    <Input id="company" placeholder="Acme Design Studio" {...form.register('company')} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="timezone" className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Timezone
                      </Label>
                      <select
                        id="timezone"
                        {...form.register('timezone')}
                        className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                      >
                        {TIMEZONES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="locale" className="flex items-center gap-2">
                        <Languages className="h-4 w-4" />
                        Language
                      </Label>
                      <select
                        id="locale"
                        {...form.register('locale')}
                        className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                      >
                        {LOCALES.map((l) => (
                          <option key={l.value} value={l.value}>
                            {l.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit">Save</Button>
                    <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <AvatarUploader
        open={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
        onSuccess={() => onUpdate()}
      />
    </>
  )
}
