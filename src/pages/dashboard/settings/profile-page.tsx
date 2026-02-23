import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Key,
  Smartphone,
  RefreshCw,
  LayoutDashboard,
  Settings,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getMe } from '@/api/users'
import {
  ProfileCard,
  PasswordChangeModal,
  PasswordResetCard,
  AccountDeletionPanel,
  ConnectedAccountsCard,
  SecuritySessionsCard,
  ProfileQuickNav,
} from '@/components/profile'
import {
  TOTPSetupModal,
  SMSSetupModal,
  RecoveryCodesModal,
  Disable2FAModal,
  EnableMethodModal,
  RegenerateRecoveryModal,
} from '@/components/twofa'

const SECTION_IDS = ['profile', 'security', 'password', '2fa', 'password-reset', 'sessions', 'connected', 'delete'] as const

function useActiveSection(sectionIds: readonly string[]) {
  const [activeSection, setActiveSection] = useState<string | null>(null)

  const handleNavigate = useCallback((id: string) => {
    const el = document.getElementById(id)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveSection(id)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
            break
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    )

    sectionIds.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [sectionIds])

  return { activeSection, handleNavigate }
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
  const [disconnectModal, setDisconnectModal] = useState<{
    provider: string
    name: string
    email?: string | null
  } | null>(null)

  const { activeSection, handleNavigate } = useActiveSection([...SECTION_IDS])

  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: getMe,
  })

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Profile</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your account details, security settings, and connected
            integrations
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/dashboard/overview">
            <Button variant="outline" size="sm" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <Link to="/dashboard/settings">
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="lg:w-56 shrink-0">
          <div className="sticky top-24 rounded-lg border border-border bg-card p-2">
            <p className="mb-2 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Quick navigation
            </p>
            <ProfileQuickNav
              activeSection={activeSection}
              onNavigate={handleNavigate}
            />
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-8">
          <section id="profile" className="scroll-mt-8">
            <ProfileCard
              profile={profile}
              onUpdate={() =>
                queryClient.invalidateQueries({ queryKey: ['user-profile'] })
              }
            />
          </section>

          <Card
            id="security"
            className="card-hover scroll-mt-8 transition-all duration-200"
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Password & 2FA
              </CardTitle>
              <CardDescription>
                Change password and manage two-factor authentication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div id="password" className="scroll-mt-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    <span className="font-medium">Password</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPasswordModalOpen(true)}
                      className="transition-transform duration-200 hover:scale-[1.02]"
                    >
                      Change password
                    </Button>
                    <Link to="/auth/password-reset/request">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        Request reset link
                      </Button>
                    </Link>
                  </div>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Use a strong password with at least 12 characters, uppercase,
                  lowercase, number, and symbol. Reset links expire after 60
                  minutes.
                </p>
              </div>

              <div id="2fa" className="scroll-mt-8 space-y-2">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
                          className="transition-transform duration-200 hover:scale-[1.02]"
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEnableMethodOpen(true)}
                        className="transition-transform duration-200 hover:scale-[1.02]"
                      >
                        Enable 2FA
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {profile.two_fa_enabled
                    ? `2FA: Enabled (${profile.two_fa_method === 'sms' ? `SMS to ${profile.phone_masked ?? '***'}` : 'Authenticator app'})`
                    : 'Add an extra layer of security with an authenticator app or SMS.'}
                </p>
                {profile.two_fa_enabled && (
                  <p className="text-xs text-muted-foreground">
                    Store recovery codes safely. Each can be used once if you
                    lose access to your 2FA device.
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
                onSuccess={() =>
                  queryClient.invalidateQueries({ queryKey: ['user-profile'] })
                }
              />
              <RegenerateRecoveryModal
                open={regenRecoveryOpen}
                onClose={() => setRegenRecoveryOpen(false)}
                onSuccess={() =>
                  queryClient.invalidateQueries({ queryKey: ['user-profile'] })
                }
              />
            </CardContent>
          </Card>

          <SecuritySessionsCard />

          <section id="password-reset" className="scroll-mt-8">
            <PasswordResetCard
              email={profile.email}
              onSuccess={() =>
                queryClient.invalidateQueries({ queryKey: ['user-profile'] })
              }
            />
          </section>

          <section id="connected" className="scroll-mt-8">
            <ConnectedAccountsCard
              profile={profile}
              onUpdate={() => {
                queryClient.invalidateQueries({ queryKey: ['user-profile'] })
                toast.success('Provider disconnected')
              }}
              disconnectModal={disconnectModal}
              onDisconnectOpen={setDisconnectModal}
              onDisconnectClose={() => setDisconnectModal(null)}
            />
          </section>

          <AccountDeletionPanel email={profile.email} />

          <PasswordChangeModal
            open={passwordModalOpen}
            onClose={() => setPasswordModalOpen(false)}
            onSuccess={() =>
              queryClient.invalidateQueries({ queryKey: ['user-profile'] })
            }
          />
        </div>
      </div>
    </div>
  )
}
