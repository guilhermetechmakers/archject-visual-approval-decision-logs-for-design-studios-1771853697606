import { useState } from 'react'
import { Unplug, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { disconnectOAuth } from '@/api/users'
import { cn } from '@/lib/utils'

interface OAuthDisconnectModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  provider: string
  providerEmail?: string | null
}

const PROVIDER_NAMES: Record<string, string> = {
  google: 'Google',
  apple: 'Apple',
  microsoft: 'Microsoft',
}

export function OAuthDisconnectModal({
  open,
  onClose,
  onSuccess,
  provider,
  providerEmail,
}: OAuthDisconnectModalProps) {
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const providerName = PROVIDER_NAMES[provider] ?? provider
  const requiredText = 'DISCONNECT'
  const isConfirmed = confirmText === requiredText

  const handleDisconnect = async () => {
    if (!isConfirmed) return
    setLoading(true)
    setError(null)
    try {
      await disconnectOAuth(provider)
      onSuccess()
      onClose()
      setConfirmText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setConfirmText('')
    setError(null)
    onClose()
  }

  return (
    <Dialog open={open}>
      <DialogContent onClose={handleClose} className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <DialogTitle>Disconnect {providerName}</DialogTitle>
              <DialogDescription>
                You will no longer be able to sign in with {providerName}
                {providerEmail ? ` (${providerEmail})` : ''}. Type DISCONNECT to confirm.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label htmlFor="disconnect-confirm" className="block text-sm font-medium mb-2">
              Type <span className="font-mono font-bold">DISCONNECT</span> to confirm
            </label>
            <input
              id="disconnect-confirm"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              placeholder="DISCONNECT"
              className={cn(
                'flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                confirmText && confirmText !== requiredText && 'border-destructive'
              )}
              autoComplete="off"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDisconnect}
            disabled={!isConfirmed || loading}
          >
            {loading ? 'Disconnecting...' : (
              <>
                <Unplug className="mr-2 h-4 w-4" />
                Disconnect
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
