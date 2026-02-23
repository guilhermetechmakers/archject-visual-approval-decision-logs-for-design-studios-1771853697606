import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Shield,
  Key,
  Smartphone,
  Monitor,
  Unplug,
  Plug,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getMe, revokeSession } from '@/api/users'
import {
  ProfileCard,
  PasswordChangeModal,
  AccountDeletionPanel,
  OAuthDisconnectModal,
} from '@/components/profile'
import {
  TOTPSetupModal,
  SMSSetupModal,
  RecoveryCodesModal,
  Disable2FAModal,
  EnableMethodModal,
  RegenerateRecoveryModal,
} from '@/components/twofa'

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
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [enableMethodOpen, setEnableMethodOpen] = useState(false)
  const [totpSetupOpen, setTotpSetupOpen] = useState(false)
  const [smsSetupOpen, setSmsSetupOpen] = useState(false)
  const [recoveryCodesOpen, setRecoveryCodesOpen] = useState(false)
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [disable2faOpen, setDisable2faOpen] = useState(false)
  const [regenRecoveryOpen, setRegenRecoveryOpen] = useState(false)
  const [disconnectModal, setDisconnectModal] = useState<{ provider: string; name: string; email?: string | null } | null>(null)

  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: getMe,
  })

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

  return (
    <div className="space-y-8 animate-in">
      <div>
        <h2 className="text-xl font-semibold">Profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account details and security settings
        </p>
      </div>

      <ProfileCard profile={profile} onUpdate={() => queryClient.invalidateQueries({ queryKey: ['user-profile'] })} />

      <Card className="card-hover">
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
              <Button variant="outline" size="sm" onClick={() => setPasswordModalOpen(true)}>
                Change password
              </Button>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Use a strong password with at least 8 characters, uppercase, lowercase, number, and symbol.
            </p>
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

      <Card className="card-hover">
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
              const conn = profile.connected_providers.find((c) => c.provider === p.id)
              const connected = !!conn
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted font-medium">
                      {p.icon}
                    </div>
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {connected
                          ? `Connected · ${conn.email ?? 'Linked'}`
                          : p.id === 'apple' || p.id === 'microsoft'
                            ? 'Coming soon'
                            : 'Not connected'}
                      </p>
                    </div>
                  </div>
                  {p.id === 'google' ? (
                    connected ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDisconnectModal({ provider: p.id, name: p.name, email: conn.email })}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          window.location.href =
                            '/api/auth/oauth/google?redirect=' +
                            encodeURIComponent('/dashboard/settings/profile')
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

      <Card className="card-hover">
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
                  className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/30"
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

      <AccountDeletionPanel email={profile.email} />

      <PasswordChangeModal
        open={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['user-profile'] })}
      />

      <OAuthDisconnectModal
        open={!!disconnectModal}
        onClose={() => setDisconnectModal(null)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['user-profile'] })
          toast.success('Provider disconnected')
        }}
        provider={disconnectModal?.provider ?? ''}
        providerEmail={disconnectModal?.email}
      />
    </div>
  )
}
