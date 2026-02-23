import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Key } from 'lucide-react'
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
import { changePassword } from '@/api/users'
import { cn } from '@/lib/utils'

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
      'Password must include uppercase, lowercase, digit, and symbol'
    ),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type PasswordFormData = z.infer<typeof passwordSchema>

function getPasswordStrength(password: string): { score: number; label: string } {
  if (!password) return { score: 0, label: '' }
  let score = 0
  if (password.length >= 8) score++
  if (/[a-z]/.test(password)) score++
  if (/[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[@$!%*?&]/.test(password)) score++
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong']
  return { score, label: labels[score] }
}

interface PasswordChangeModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function PasswordChangeModal({ open, onClose, onSuccess }: PasswordChangeModalProps) {
  const form = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  const newPassword = form.watch('newPassword')
  const strength = getPasswordStrength(newPassword)

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })
      form.reset()
      onSuccess?.()
      onClose()
    } catch (err) {
      form.setError('currentPassword', {
        message: err instanceof Error ? err.message : 'Failed to change password',
      })
    }
  })

  const handleClose = () => {
    form.reset()
    onClose()
  }

  return (
    <Dialog open={open}>
      <DialogContent onClose={handleClose} className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Change password
          </DialogTitle>
          <DialogDescription>
            Enter your current password and choose a new one. Use at least 8 characters with uppercase, lowercase, a number, and a symbol.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current password</Label>
            <Input
              id="current-password"
              type="password"
              {...form.register('currentPassword')}
              className={form.formState.errors.currentPassword ? 'border-destructive' : ''}
              autoComplete="current-password"
            />
            {form.formState.errors.currentPassword && (
              <p className="text-sm text-destructive" role="alert">
                {form.formState.errors.currentPassword.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              {...form.register('newPassword')}
              className={form.formState.errors.newPassword ? 'border-destructive' : ''}
              autoComplete="new-password"
            />
            {newPassword && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        'h-1 flex-1 rounded-full transition-colors',
                        i <= strength.score ? 'bg-primary' : 'bg-muted'
                      )}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{strength.label}</p>
              </div>
            )}
            {form.formState.errors.newPassword && (
              <p className="text-sm text-destructive" role="alert">
                {form.formState.errors.newPassword.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              {...form.register('confirmPassword')}
              className={form.formState.errors.confirmPassword ? 'border-destructive' : ''}
              autoComplete="new-password"
            />
            {form.formState.errors.confirmPassword && (
              <p className="text-sm text-destructive" role="alert">
                {form.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit">
              Update password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
