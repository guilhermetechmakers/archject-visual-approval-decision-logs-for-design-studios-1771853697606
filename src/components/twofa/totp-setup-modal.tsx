import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { getTOTPSetup, enableTOTP } from '@/api/twofa'
import { cn } from '@/lib/utils'

const verifySchema = z.object({
  verificationCode: z.string().length(6, 'Enter the 6-digit code').regex(/^\d{6}$/, 'Code must be 6 digits'),
  password: z.string().min(1, 'Password is required'),
})

type VerifyFormData = z.infer<typeof verifySchema>

interface TOTPSetupModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (recoveryCodes: string[]) => void
}

export function TOTPSetupModal({ open, onClose, onSuccess }: TOTPSetupModalProps) {
  const [step, setStep] = useState<'loading' | 'qr' | 'verify' | 'done'>('loading')
  const [qrDataUri, setQrDataUri] = useState('')
  const [secret, setSecret] = useState('')
  const [copied, setCopied] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<VerifyFormData>({
    resolver: zodResolver(verifySchema),
    defaultValues: { verificationCode: '', password: '' },
  })

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setStep('loading')
    getTOTPSetup()
      .then((data) => {
        if (!cancelled) {
          setQrDataUri(data.qr_data_uri)
          setSecret(data.secret)
          setStep('qr')
        }
      })
      .catch(() => {
        if (!cancelled) {
          toast.error('Failed to load setup. Please try again.')
          onClose()
        }
      })
    return () => {
      cancelled = true
    }
  }, [open, onClose])

  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret)
      setCopied(true)
      toast.success('Secret copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }

  const onSubmit = async (data: VerifyFormData) => {
    setIsSubmitting(true)
    try {
      const res = await enableTOTP(data.verificationCode, data.password)
      toast.success('2FA enabled successfully')
      onSuccess(res.recovery_codes)
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid code. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    onClose()
    setStep('loading')
    form.reset()
  }

  if (!open) return null

  if (step === 'loading') {
    return (
      <Dialog open={open}>
        <DialogContent onClose={handleClose} showClose={true}>
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
            <p className="text-sm text-muted-foreground">Preparing 2FA setup...</p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open}>
      <DialogContent onClose={handleClose} showClose={true}>
        <DialogHeader>
          <DialogTitle>Set up authenticator app</DialogTitle>
          <DialogDescription>
            Scan this QR code with your authenticator app (e.g., Google Authenticator, Authy). Enter the 6-digit code
            to confirm.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex flex-col items-center">
            <div className="rounded-xl border border-border bg-white p-4 shadow-card">
              <img
                src={qrDataUri}
                alt="QR code for authenticator app"
                className="h-48 w-48"
              />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopySecret}
                className="gap-2"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-success" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy secret
                  </>
                )}
              </Button>
            </div>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="totp-code">Authentication code</Label>
              <Input
                id="totp-code"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                {...form.register('verificationCode')}
                className={cn(
                  'font-mono text-lg tracking-widest',
                  form.formState.errors.verificationCode && 'border-destructive'
                )}
                aria-invalid={!!form.formState.errors.verificationCode}
              />
              {form.formState.errors.verificationCode && (
                <p className="text-sm text-destructive" role="alert">
                  {form.formState.errors.verificationCode.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="totp-password">Confirm your password</Label>
              <Input
                id="totp-password"
                type="password"
                {...form.register('password')}
                className={form.formState.errors.password ? 'border-destructive' : ''}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="submit" isLoading={isSubmitting}>
                Verify and enable
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
