import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  User,
  Mail,
  Building2,
  Shield,
  Key,
  Smartphone,
  Monitor,
  Unplug,
  Plug,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getMe,
  updateProfile,
  changePassword,
  revokeSession,
  type UpdateProfileRequest,
} from '@/api/users'
import {
  TOTPSetupModal,
  SMSSetupModal,
  RecoveryCodesModal,
  Disable2FAModal,
  EnableMethodModal,
  RegenerateRecoveryModal,
} from '@/components/twofa'

const profileSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100, 'Max 100 characters'),
  last_name: z.string().min(1, 'Last name is required').max(100, 'Max 100 characters'),
  company: z.string().max(200).optional(),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(10, 'Password must be at least 10 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
      'Password must include uppercase, lowercase, digit, and special character'
    ),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type ProfileFormData = z.infer<typeof profileSchema>
type PasswordFormData = z.infer<typeof passwordSchema>

const PROVIDERS = [
  { id: 'google', name: 'Google', icon: 'G' },
  { id: 'apple', name: 'Apple', icon: 'A' },
  { id: 'microsoft', name: 'Microsoft', icon: 'M' },
] as const

function formatUserAgent(ua: string | null): string {
  if (!ua) return 'Unknown device'
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari'
  if (ua.includes('Edg')) return 'Edge'
  return 'Browser'
}

export function ProfilePage() {
  const queryClient = useQueryClient()
  const [passwordFormOpen, setPasswordFormOpen] = useState(false)
  const [enableMethodOpen, setEnableMethodOpen] = useState(false)
  const [totpSetupOpen, setTotpSetupOpen] = useState(false)
  const [smsSetupOpen, setSmsSetupOpen] = useState(false)
  const [recoveryCodesOpen, setRecoveryCodesOpen] = useState(false)
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [disable2faOpen, setDisable2faOpen] = useState(false)
  const [regenRecoveryOpen, setRegenRecoveryOpen] = useState(false)

  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: getMe,
  })

  const updateMutation = useMutation({
    mutationFn: (data: UpdateProfileRequest) => updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] })
      toast.success('Profile updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const passwordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword }),
    onSuccess: () => {
      toast.success('Password updated')
      setPasswordFormOpen(false)
      passwordForm.reset()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: profile
      ? {
          first_name: profile.first_name,
          last_name: profile.last_name,
          company: profile.company ?? '',
        }
      : undefined,
  })

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  const onProfileSubmit = (data: ProfileFormData) => {
    updateMutation.mutate({
      first_name: data.first_name,
      last_name: data.last_name,
      company: data.company || undefined,
    })
  }

  const onPasswordSubmit = (data: PasswordFormData) => {
    passwordMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    })
  }

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await revokeSession(sessionId)
      queryClient.invalidateQueries({ queryKey: ['user-profile'] })
      toast.success('Session signed out')
    } catch {
      toast.error('Failed to revoke session')
    }
  }

  if (isLoading || !profile) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const connectedProviders = profile.connected_providers.map((p) => p.provider)

  return (
    <div className="space-y-8 animate-in">
      <div>
        <h2 className="text-xl font-semibold">Profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account details and security settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account
          </CardTitle>
          <CardDescription>Update your name and studio information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">First name</Label>
                <Input
                  id="first_name"
                  {...profileForm.register('first_name')}
                  className={profileForm.formState.errors.first_name ? 'border-destructive' : ''}
                />
                {profileForm.formState.errors.first_name && (
                  <p className="text-sm text-destructive">{profileForm.formState.errors.first_name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last name</Label>
                <Input
                  id="last_name"
                  {...profileForm.register('last_name')}
                  className={profileForm.formState.errors.last_name ? 'border-destructive' : ''}
                />
                {profileForm.formState.errors.last_name && (
                  <p className="text-sm text-destructive">{profileForm.formState.errors.last_name.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input value={profile.email} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">
                Email change requires verification. Contact support if needed.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="company" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Studio name
              </Label>
              <Input
                id="company"
                placeholder="Acme Design Studio"
                {...profileForm.register('company')}
              />
            </div>
            <Button type="submit" isLoading={updateMutation.isPending}>
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security
          </CardTitle>
          <CardDescription>Change password and manage two-factor authentication</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                <span className="font-medium">Password</span>
              </div>
              {!passwordFormOpen ? (
                <Button variant="outline" size="sm" onClick={() => setPasswordFormOpen(true)}>
                  Change password
                </Button>
              ) : null}
            </div>
            {passwordFormOpen && (
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    {...passwordForm.register('currentPassword')}
                    className={passwordForm.formState.errors.currentPassword ? 'border-destructive' : ''}
                  />
                  {passwordForm.formState.errors.currentPassword && (
                    <p className="text-sm text-destructive">{passwordForm.formState.errors.currentPassword.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    {...passwordForm.register('newPassword')}
                    className={passwordForm.formState.errors.newPassword ? 'border-destructive' : ''}
                  />
                  {passwordForm.formState.errors.newPassword && (
                    <p className="text-sm text-destructive">{passwordForm.formState.errors.newPassword.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">Confirm new password</Label>
                  <Input
                    id="confirm-new-password"
                    type="password"
                    {...passwordForm.register('confirmPassword')}
                    className={passwordForm.formState.errors.confirmPassword ? 'border-destructive' : ''}
                  />
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive">{passwordForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="submit" isLoading={passwordMutation.isPending}>
                    Update password
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setPasswordFormOpen(false)
                      passwordForm.reset()
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                <span className="font-medium">Two-factor authentication</span>
              </div>
              <div className="flex gap-2">
                {profile.two_fa_enabled ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRegenRecoveryOpen(true)}
                    >
                      <RefreshCw className="mr-1 h-4 w-4" />
                      Regenerate
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDisable2faOpen(true)}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      Disable 2FA
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setEnableMethodOpen(true)}>
                    Enable 2FA
                  </Button>
                )}
              </div>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {profile.two_fa_enabled
                ? `2FA: Enabled (${profile.two_fa_method === 'sms' ? `SMS to ${profile.phone_masked ?? '***'}` : 'Authenticator app'})`
                : 'Add an extra layer of security with an authenticator app or SMS.'}
            </p>
            {profile.two_fa_enabled && (
              <p className="mt-1 text-xs text-muted-foreground">
                Store recovery codes safely. Each can be used once if you lose access to your 2FA device.
              </p>
            )}
          </div>

          <EnableMethodModal
            open={enableMethodOpen}
            onClose={() => setEnableMethodOpen(false)}
            onSelectTotp={() => setTotpSetupOpen(true)}
            onSelectSms={() => setSmsSetupOpen(true)}
          />
          <TOTPSetupModal
            open={totpSetupOpen}
            onClose={() => setTotpSetupOpen(false)}
            onSuccess={(codes) => {
              setRecoveryCodes(codes)
              setRecoveryCodesOpen(true)
              queryClient.invalidateQueries({ queryKey: ['user-profile'] })
            }}
          />
          <SMSSetupModal
            open={smsSetupOpen}
            onClose={() => setSmsSetupOpen(false)}
            onSuccess={(codes) => {
              setRecoveryCodes(codes)
              setRecoveryCodesOpen(true)
              queryClient.invalidateQueries({ queryKey: ['user-profile'] })
            }}
          />
          <RecoveryCodesModal
            open={recoveryCodesOpen}
            codes={recoveryCodes}
            onClose={() => {
              setRecoveryCodesOpen(false)
              setRecoveryCodes([])
            }}
          />
          <Disable2FAModal
            open={disable2faOpen}
            onClose={() => setDisable2faOpen(false)}
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ['user-profile'] })}
          />
          <RegenerateRecoveryModal
            open={regenRecoveryOpen}
            onClose={() => setRegenRecoveryOpen(false)}
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ['user-profile'] })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5" />
            Connected apps
          </CardTitle>
          <CardDescription>Link your account to sign in with Google, Apple, or Microsoft</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {PROVIDERS.map((p) => {
              const connected = connectedProviders.includes(p.id)
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted font-medium">
                      {p.icon}
                    </div>
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {connected ? 'Connected' : p.id === 'apple' || p.id === 'microsoft' ? 'Coming soon' : 'Not connected'}
                      </p>
                    </div>
                  </div>
                  {p.id === 'google' ? (
                    connected ? (
                      <Button variant="outline" size="sm" disabled>
                        Connected
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          window.location.href = '/api/auth/oauth/google?redirect=' + encodeURIComponent('/dashboard/settings/profile')
                        }}
                      >
                        Connect
                      </Button>
                    )
                  ) : (
                    <Button variant="outline" size="sm" disabled>
                      Coming soon
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Active sessions
          </CardTitle>
          <CardDescription>Manage your active sessions and sign out from other devices</CardDescription>
        </CardHeader>
        <CardContent>
          {profile.sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active sessions</p>
          ) : (
            <div className="space-y-3">
              {profile.sessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
                >
                  <div className="flex items-center gap-3">
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{formatUserAgent(s.user_agent)}</p>
                      <p className="text-sm text-muted-foreground">
                        {s.ip ?? 'Unknown IP'} · Last active {new Date(s.last_active_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRevokeSession(s.id)}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Unplug className="mr-1 h-4 w-4" />
                    Sign out
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
