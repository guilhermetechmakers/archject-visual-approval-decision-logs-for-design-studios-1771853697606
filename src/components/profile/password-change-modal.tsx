import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Key, Eye, EyeOff } from 'lucide-react'
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
import { PasswordStrengthMeter, getPasswordStrength } from '@/components/auth/password-strength-meter'
import { cn } from '@/lib/utils'

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(12, 'Password must be at least 12 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
        'Password must include uppercase, lowercase, digit, and symbol'
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type PasswordFormData = z.infer<typeof passwordSchema>

interface PasswordChangeModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function PasswordChangeModal({ open, onClose, onSuccess }: PasswordChangeModalProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [successPill, setSuccessPill] = useState(false)

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
      setSuccessPill(true)
      form.reset()
      onSuccess?.()
      toast.success('Password updated successfully')
      setTimeout(() => {
        setSuccessPill(false)
        onClose()
      }, 1500)
    } catch (err) {
      form.setError('currentPassword', {
        message: err instanceof Error ? err.message : 'Failed to change password',
      })
    }
  })

  const handleClose = () => {
    form.reset()
    setSuccessPill(false)
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
            Enter your current password and choose a new one. Use at least 12 characters with uppercase, lowercase, a
            number, and a symbol.
          </DialogDescription>
        </DialogHeader>

        {successPill && (
          <div
            className="rounded-lg bg-success/10 px-4 py-2 text-sm font-medium text-success"
            role="status"
            aria-live="polite"
          >
            Password updated successfully
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current password</Label>
            <Input
              id="current-password"
              type="password"
              {...form.register('currentPassword')}
              className={cn('border-[#D1D5DB]', form.formState.errors.currentPassword && 'border-destructive')}
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
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                {...form.register('newPassword')}
                className={cn(
                  'border-[#D1D5DB] pr-10',
                  form.formState.errors.newPassword && 'border-destructive'
                )}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <PasswordStrengthMeter password={newPassword} />
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
              className={cn('border-[#D1D5DB]', form.formState.errors.confirmPassword && 'border-destructive')}
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
            <Button
              type="submit"
              style={{ backgroundColor: '#0052CC' }}
              disabled={strength.level === 'weak'}
            >
              Update password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
