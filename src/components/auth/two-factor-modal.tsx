import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface TwoFAStep {
  sessionTempToken: string
  twofaMethods: ('totp' | 'sms')[]
  phoneMasked: string | null
}

interface TwoFactorModalProps {
  step: TwoFAStep
  onVerify: (code: string, method: 'totp' | 'sms' | 'recovery', rememberDevice: boolean) => Promise<void>
  onSendSms?: () => Promise<void>
  onBack: () => void
  redirectTo?: string
}

export function TwoFactorModal({
  step,
  onVerify,
  onSendSms,
  onBack,
}: TwoFactorModalProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [useRecovery, setUseRecovery] = useState(false)
  const [rememberDevice, setRememberDevice] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [smsCooldown, setSmsCooldown] = useState(0)

  useEffect(() => {
    if (smsCooldown <= 0) return
    const t = setTimeout(() => setSmsCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [smsCooldown])

  const methodLabel =
    step.twofaMethods.length === 1 && step.twofaMethods[0] === 'totp'
      ? 'Authenticator app'
      : step.twofaMethods.length === 1 && step.twofaMethods[0] === 'sms'
        ? `SMS to ${step.phoneMasked ?? '***'}`
        : `Authenticator app or SMS to ${step.phoneMasked ?? '***'}`

  const handleVerify = async () => {
    if (!code.trim()) return
    setError(null)
    setIsSubmitting(true)
    try {
      const method = useRecovery ? 'recovery' : (step.twofaMethods.includes('totp') ? 'totp' : 'sms')
      await onVerify(code.trim(), method, rememberDevice)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code. Please try again.')
      const data = err && typeof err === 'object' && 'data' in err
        ? (err as { data?: { code?: string } }).data
        : undefined
      if (data?.code === '2FA_LOCKOUT') {
        setError('Too many failed attempts. Please try again later.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSendSms = async () => {
    if (!onSendSms || smsCooldown > 0) return
    try {
      await onSendSms()
      setSmsCooldown(60)
    } catch {
      setSmsCooldown(60)
    }
  }

  return (
    <Card
      className={cn(
        'w-full max-w-[420px] rounded-xl border border-[#E5E7EB] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]',
        'transition-shadow duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]',
        'py-7 px-6'
      )}
    >
      <CardHeader className="p-0 pb-6">
        <CardTitle className="text-center text-[22px]">Two-factor authentication</CardTitle>
        <CardDescription className="text-center text-[15px]">
          Enter the 6-digit code from your {methodLabel}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="2fa-code">Authentication code</Label>
          <Input
            id="2fa-code"
            inputMode="numeric"
            maxLength={useRecovery ? 20 : 6}
            placeholder={useRecovery ? 'Recovery code' : '000000'}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={cn(error && 'border-destructive')}
            aria-invalid={!!error}
            aria-describedby={error ? '2fa-error' : undefined}
            autoComplete="one-time-code"
          />
          {error && (
            <p id="2fa-error" className="text-sm text-[#EF4444]" role="alert">
              {error}
            </p>
          )}
        </div>
        {step.twofaMethods.includes('sms') && onSendSms && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Didn&apos;t receive a code?</span>
            <button
              type="button"
              onClick={handleSendSms}
              disabled={smsCooldown > 0}
              className="text-primary hover:underline disabled:opacity-50 disabled:no-underline focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
              {smsCooldown > 0 ? `Resend in ${smsCooldown}s` : 'Send code'}
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Checkbox
            id="2fa-remember"
            checked={rememberDevice}
            onCheckedChange={(checked) => setRememberDevice(!!checked)}
            aria-describedby="2fa-remember-label"
          />
          <Label id="2fa-remember-label" htmlFor="2fa-remember" className="text-sm font-normal cursor-pointer">
            Remember this device for 30 days
          </Label>
        </div>
        <Button
          className="w-full bg-[#0052CC] hover:bg-[#0052CC]/90"
          onClick={handleVerify}
          disabled={isSubmitting || !code.trim()}
          isLoading={isSubmitting}
        >
          Verify
        </Button>
        <button
          type="button"
          onClick={() => {
            setUseRecovery(!useRecovery)
            setCode('')
            setError(null)
          }}
          className="w-full text-center text-sm text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          {useRecovery ? 'Use authentication code' : 'Use a recovery code'}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          Back to login
        </button>
      </CardContent>
    </Card>
  )
}
