import { useState } from 'react'
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
import { regenerateRecoveryCodes } from '@/api/twofa'
import { RecoveryCodesModal } from './recovery-codes-modal'

const regenerateSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  code: z.string().min(6, 'Enter your 2FA code'),
})

type RegenerateFormData = z.infer<typeof regenerateSchema>

interface RegenerateRecoveryModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function RegenerateRecoveryModal({ open, onClose, onSuccess }: RegenerateRecoveryModalProps) {
  const [newCodes, setNewCodes] = useState<string[]>([])
  const [showCodes, setShowCodes] = useState(false)

  const form = useForm<RegenerateFormData>({
    resolver: zodResolver(regenerateSchema),
    defaultValues: { password: '', code: '' },
  })

  const onSubmit = async (data: RegenerateFormData) => {
    try {
      const res = await regenerateRecoveryCodes(data.password, data.code)
      setNewCodes(res.recovery_codes)
      setShowCodes(true)
      form.reset()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to regenerate codes')
    }
  }

  const handleCodesClose = () => {
    setShowCodes(false)
    setNewCodes([])
    onSuccess()
    onClose()
  }

  if (!open) return null

  return (
    <>
      <Dialog open={open}>
        <DialogContent onClose={onClose} showClose={true}>
          <DialogHeader>
            <DialogTitle>Regenerate recovery codes</DialogTitle>
            <DialogDescription>
              Enter your password and a valid 2FA code. Your old recovery codes will stop working.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="regen-password">Password</Label>
              <Input
                id="regen-password"
                type="password"
                {...form.register('password')}
                className={form.formState.errors.password ? 'border-destructive' : ''}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="regen-code">Authentication code</Label>
              <Input
                id="regen-code"
                {...form.register('code')}
                placeholder="6-digit code"
                className={form.formState.errors.code ? 'border-destructive' : ''}
              />
              {form.formState.errors.code && (
                <p className="text-sm text-destructive">{form.formState.errors.code.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" isLoading={form.formState.isSubmitting}>
                Regenerate codes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <RecoveryCodesModal open={showCodes} codes={newCodes} onClose={handleCodesClose} />
    </>
  )
}
