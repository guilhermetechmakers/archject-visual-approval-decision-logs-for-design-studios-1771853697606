import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
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
import { sendSMSOTP, enableSMS } from '@/api/twofa'
import { cn } from '@/lib/utils'

const phoneSchema = z.object({
  phoneNumber: z.string().min(10, 'Enter a valid phone number'),
})

const verifySchema = z.object({
  verificationCode: z.string().length(6, 'Enter the 6-digit code').regex(/^\d{6}$/, 'Code must be 6 digits'),
  password: z.string().min(1, 'Password is required'),
})

type PhoneFormData = z.infer<typeof phoneSchema>
type VerifyFormData = z.infer<typeof verifySchema>

interface SMSSetupModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (recoveryCodes: string[]) => void
}

export function SMSSetupModal({ open, onClose, onSuccess }: SMSSetupModalProps) {
  const [step, setStep] = useState<'phone' | 'verify'>('phone')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [isSending, setIsSending] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const phoneForm = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phoneNumber: '' },
  })

  const verifyForm = useForm<VerifyFormData>({
    resolver: zodResolver(verifySchema),
    defaultValues: { verificationCode: '', password: '' },
  })

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const sendCode = async () => {
    const phone = phoneForm.getValues('phoneNumber')
    if (!phone) return
    setIsSending(true)
    try {
      const res = await sendSMSOTP(phone, 'enable')
      if (res.sent) {
        setPhoneNumber(phone)
        setStep('verify')
        setCooldown(res.cooldown_seconds ?? 60)
        toast.success('Verification code sent')
      } else {
        toast.error('Please wait before requesting another code.')
        setCooldown(res.cooldown_seconds ?? 60)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send code')
    } finally {
      setIsSending(false)
    }
  }

  const onSubmitPhone = () => {
    sendCode()
  }

  const onSubmitVerify = async (data: VerifyFormData) => {
    setIsSubmitting(true)
    try {
      const res = await enableSMS(phoneNumber, data.verificationCode, data.password)
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
    setStep('phone')
    phoneForm.reset()
    verifyForm.reset()
  }

  if (!open) return null

  return (
    <Dialog open={open}>
      <DialogContent onClose={handleClose} showClose={true}>
        <DialogHeader>
          <DialogTitle>Set up SMS verification</DialogTitle>
          <DialogDescription>
            {step === 'phone'
              ? 'Enter your phone number to receive verification codes.'
              : 'Standard message rates may apply. If you do not receive a code within 2 minutes try resending.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'phone' ? (
          <form onSubmit={phoneForm.handleSubmit(onSubmitPhone)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sms-phone">Phone number</Label>
              <Input
                id="sms-phone"
                type="tel"
                placeholder="+1 234 567 8900"
                {...phoneForm.register('phoneNumber')}
                className={phoneForm.formState.errors.phoneNumber ? 'border-destructive' : ''}
              />
              {phoneForm.formState.errors.phoneNumber && (
                <p className="text-sm text-destructive">{phoneForm.formState.errors.phoneNumber.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="submit" isLoading={isSending}>
                Send code
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={verifyForm.handleSubmit(onSubmitVerify)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sms-code">Authentication code</Label>
              <Input
                id="sms-code"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                {...verifyForm.register('verificationCode')}
                className={cn(
                  'font-mono text-lg tracking-widest',
                  verifyForm.formState.errors.verificationCode && 'border-destructive'
                )}
              />
              {verifyForm.formState.errors.verificationCode && (
                <p className="text-sm text-destructive">{verifyForm.formState.errors.verificationCode.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sms-password">Confirm your password</Label>
              <Input
                id="sms-password"
                type="password"
                {...verifyForm.register('password')}
                className={verifyForm.formState.errors.password ? 'border-destructive' : ''}
              />
              {verifyForm.formState.errors.password && (
                <p className="text-sm text-destructive">{verifyForm.formState.errors.password.message}</p>
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={sendCode}
                disabled={cooldown > 0 || isSending}
                className="text-primary hover:underline disabled:opacity-50 disabled:no-underline"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
              </button>
            </div>
            <DialogFooter>
              <Button type="submit" isLoading={isSubmitting}>
                Verify and enable
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
