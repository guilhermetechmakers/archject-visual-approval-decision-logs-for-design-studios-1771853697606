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
import { disable2FA } from '@/api/twofa'

const disableSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  code: z.string().min(6, 'Enter your 2FA code or recovery code'),
})

type DisableFormData = z.infer<typeof disableSchema>

interface Disable2FAModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function Disable2FAModal({ open, onClose, onSuccess }: Disable2FAModalProps) {
  const form = useForm<DisableFormData>({
    resolver: zodResolver(disableSchema),
    defaultValues: { password: '', code: '' },
  })

  const onSubmit = async (data: DisableFormData) => {
    try {
      await disable2FA(data.password, data.code)
      toast.success('2FA has been disabled')
      onSuccess()
      onClose()
      form.reset()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to disable 2FA')
    }
  }

  if (!open) return null

  return (
    <Dialog open={open}>
      <DialogContent onClose={onClose} showClose={true}>
        <DialogHeader>
          <DialogTitle>Disable two-factor authentication</DialogTitle>
          <DialogDescription>
            Enter your password and a valid 2FA code (or recovery code) to confirm.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="disable-password">Password</Label>
            <Input
              id="disable-password"
              type="password"
              {...form.register('password')}
              className={form.formState.errors.password ? 'border-destructive' : ''}
            />
            {form.formState.errors.password && (
              <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="disable-code">Authentication code or recovery code</Label>
            <Input
              id="disable-code"
              {...form.register('code')}
              placeholder="6-digit code or recovery code"
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
            <Button type="submit" variant="destructive" isLoading={form.formState.isSubmitting}>
              Disable 2FA
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
