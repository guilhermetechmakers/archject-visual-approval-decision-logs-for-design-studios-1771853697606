import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, type SelectOption } from '@/components/ui/select'
import { Upload } from 'lucide-react'
import { adminApi } from '@/api/admin'

const roleOptions: SelectOption[] = [
  { value: 'member', label: 'Member' },
  { value: 'admin', label: 'Admin' },
  { value: 'editor', label: 'Editor' },
  { value: 'reviewer', label: 'Reviewer' },
  { value: 'viewer', label: 'Viewer' },
]

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function parseEmails(text: string): string[] {
  return text
    .split(/[\s,;\n]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e && emailRegex.test(e))
}

interface InviteUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InviteUserModal({ open, onOpenChange }: InviteUserModalProps) {
  const queryClient = useQueryClient()
  const [emailsText, setEmailsText] = useState('')
  const [role, setRole] = useState('member')
  const [message, setMessage] = useState('')
  const [expiresInDays, setExpiresInDays] = useState(7)
  const [csvFile, setCsvFile] = useState<File | null>(null)

  const inviteMutation = useMutation({
    mutationFn: (emails: string[]) =>
      adminApi.inviteUsers({ emails, role, message, expiresInDays }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'analytics', 'users'] })
      const count = data.invitesCreated.length
      if (data.warnings?.length) {
        toast.warning(`${count} invites sent. ${data.warnings.length} warnings.`)
      } else {
        toast.success(`${count} invite${count > 1 ? 's' : ''} sent`)
      }
      onOpenChange(false)
      setEmailsText('')
      setMessage('')
    },
    onError: () => toast.error('Failed to send invites'),
  })

  const uploadMutation = useMutation({
    mutationFn: () => adminApi.uploadInviteCsv(csvFile!, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast.success('CSV upload queued')
      onOpenChange(false)
      setCsvFile(null)
    },
    onError: () => toast.error('Failed to upload CSV'),
  })

  const emails = parseEmails(emailsText)
  const duplicates = emails.filter((e, i) => emails.indexOf(e) !== i)
  const uniqueEmails = [...new Set(emails)]
  const hasInvalid = emailsText.trim().length > 0 && emails.length === 0 && emailsText.split(/[\s,;\n]+/).some((s) => s.trim().length > 0)

  const handleSubmit = () => {
    if (uniqueEmails.length === 0) {
      toast.error('Enter at least one valid email')
      return
    }
    inviteMutation.mutate(uniqueEmails)
  }

  const handleCsvUpload = () => {
    if (!csvFile) return
    uploadMutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>Invite users</DialogTitle>
          <DialogDescription>
            Enter email addresses (comma or newline separated) or upload a CSV file.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="emails">Email addresses</Label>
            <textarea
              id="emails"
              placeholder="user1@example.com, user2@example.com"
              value={emailsText}
              onChange={(e) => setEmailsText(e.target.value)}
              className="mt-2 min-h-[100px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              rows={4}
            />
            {hasInvalid && (
              <p className="mt-1 text-sm text-destructive">Please enter valid email addresses</p>
            )}
            {duplicates.length > 0 && (
              <p className="mt-1 text-sm text-warning">Removed {duplicates.length} duplicate(s)</p>
            )}
            {uniqueEmails.length > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                {uniqueEmails.length} valid email(s) ready to invite
              </p>
            )}
          </div>
          <div>
            <Label>Role</Label>
            <div className="mt-2">
              <Select options={roleOptions} value={role} onValueChange={setRole} placeholder="Select role" />
            </div>
          </div>
          <div>
            <Label htmlFor="message">Optional message</Label>
            <Textarea
              id="message"
              placeholder="Add a personal message to the invite..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-2"
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="expires">Expires in (days)</Label>
            <Input
              id="expires"
              type="number"
              min={1}
              max={30}
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(parseInt(e.target.value, 10) || 7)}
              className="mt-2 w-24"
            />
          </div>
          <div className="border-t border-border pt-4">
            <Label className="mb-2 block">Or upload CSV</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
                className="max-w-[200px]"
              />
              <Button
                variant="outline"
                size="sm"
                disabled={!csvFile || uploadMutation.isPending}
                onClick={handleCsvUpload}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={uniqueEmails.length === 0 || inviteMutation.isPending}
          >
            {inviteMutation.isPending ? 'Sending...' : `Send ${uniqueEmails.length} invite(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
