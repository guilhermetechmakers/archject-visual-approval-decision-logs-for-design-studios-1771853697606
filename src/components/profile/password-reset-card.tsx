import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { KeyRound, Mail, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { requestPasswordReset } from '@/api/auth'
import type { ApiError } from '@/lib/api'

const THROTTLE_SECONDS = 60

export interface PasswordResetCardProps {
  email: string
  onSuccess?: () => void
}

export function PasswordResetCard({ email, onSuccess }: PasswordResetCardProps) {
  const [requested, setRequested] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  const mutation = useMutation({
    mutationFn: (e: string) => requestPasswordReset(e),
    onSuccess: () => {
      setRequested(true)
      setCooldown(THROTTLE_SECONDS)
      const interval = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) {
            clearInterval(interval)
            return 0
          }
          return c - 1
        })
      }, 1000)
      toast.success('If an account exists for this email, a reset link has been sent.')
      onSuccess?.()
    },
    onError: (err: unknown) => {
      const apiErr = err as ApiError
      const retryAfter = apiErr?.data?.retry_after as number | undefined
      if (retryAfter && retryAfter > 0) {
        setCooldown(Math.ceil(retryAfter))
        const interval = setInterval(() => {
          setCooldown((c) => {
            if (c <= 1) {
              clearInterval(interval)
              return 0
            }
            return c - 1
          })
        }, 1000)
      }
      toast.error((err as { message?: string })?.message ?? 'Failed to send reset link')
    },
  })

  const handleRequest = () => {
    if (cooldown > 0) return
    mutation.mutate(email)
  }

  return (
    <Card className="card-hover transition-all duration-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          Password reset
        </CardTitle>
        <CardDescription>
          Request a password reset link sent to your email. The link expires in 1 hour and is rate-limited.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reset-email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email address
          </Label>
          <Input
            id="reset-email"
            type="email"
            value={email}
            disabled
            className="bg-muted"
            aria-describedby="reset-email-hint"
          />
          <p id="reset-email-hint" className="text-xs text-muted-foreground">
            Reset link will be sent to this address
          </p>
        </div>

        {cooldown > 0 && (
          <div
            className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-4 py-2 text-sm text-warning"
            role="status"
            aria-live="polite"
          >
            <Clock className="h-4 w-4 shrink-0" />
            <span>Rate limited. Try again in {cooldown} seconds.</span>
          </div>
        )}

        {requested && cooldown === 0 && (
          <p className="text-sm text-success" role="status">
            Check your inbox for the reset link. You can request another in {THROTTLE_SECONDS} seconds.
          </p>
        )}

        <Button
          onClick={handleRequest}
          disabled={mutation.isPending || cooldown > 0}
          className="bg-[rgb(0,82,204)] hover:bg-[rgb(0,82,204)]/90 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          {mutation.isPending ? 'Sending...' : 'Send reset link'}
        </Button>
      </CardContent>
    </Card>
  )
}
