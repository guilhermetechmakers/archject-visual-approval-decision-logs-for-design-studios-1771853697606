import { Plug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { OAuthDisconnectModal } from './oauth-disconnect-modal'
import type { UserProfile } from '@/api/users'

const PROVIDERS = [
  { id: 'google', name: 'Google', icon: 'G' },
  { id: 'apple', name: 'Apple', icon: 'A' },
  { id: 'microsoft', name: 'Microsoft', icon: 'M' },
  { id: 'github', name: 'GitHub', icon: 'G' },
] as const

export interface ConnectedAccountsCardProps {
  profile: UserProfile
  onUpdate: () => void
  disconnectModal: { provider: string; name: string; email?: string | null } | null
  onDisconnectOpen: (data: { provider: string; name: string; email?: string | null }) => void
  onDisconnectClose: () => void
}

export function ConnectedAccountsCard({
  profile,
  onUpdate,
  disconnectModal,
  onDisconnectOpen,
  onDisconnectClose,
}: ConnectedAccountsCardProps) {
  return (
    <>
      <Card className="card-hover transition-all duration-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5" />
            Connected accounts
          </CardTitle>
          <CardDescription>
            Link your account to sign in with Google, Apple, Microsoft, or GitHub
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {PROVIDERS.map((p) => {
              const conn = profile.connected_providers.find((c) => c.provider === p.id)
              const connected = !!conn
              const comingSoon = p.id === 'apple' || p.id === 'microsoft' || p.id === 'github'
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
                          : comingSoon
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
                        onClick={() =>
                          onDisconnectOpen({ provider: p.id, name: p.name, email: conn.email })
                        }
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
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
                        className="transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
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

      <OAuthDisconnectModal
        open={!!disconnectModal}
        onClose={onDisconnectClose}
        onSuccess={() => {
          onUpdate()
          onDisconnectClose()
        }}
        provider={disconnectModal?.provider ?? ''}
        providerEmail={disconnectModal?.email}
      />
    </>
  )
}
