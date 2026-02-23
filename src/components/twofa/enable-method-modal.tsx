import { Smartphone, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface EnableMethodModalProps {
  open: boolean
  onClose: () => void
  onSelectTotp: () => void
  onSelectSms: () => void
}

export function EnableMethodModal({ open, onClose, onSelectTotp, onSelectSms }: EnableMethodModalProps) {
  if (!open) return null

  return (
    <Dialog open={open}>
      <DialogContent onClose={onClose} showClose={true}>
        <DialogHeader>
          <DialogTitle>Enable two-factor authentication</DialogTitle>
          <DialogDescription>
            Choose how you want to receive your verification codes.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <Button
            variant="outline"
            className="h-auto flex-col items-start gap-2 p-4"
            onClick={() => {
              onSelectTotp()
              onClose()
            }}
          >
            <div className="flex w-full items-center gap-3">
              <Smartphone className="h-5 w-5" />
              <span className="font-medium">Authenticator app</span>
            </div>
            <p className="text-left text-sm text-muted-foreground">
              Use an app like Google Authenticator or Authy to generate codes.
            </p>
          </Button>
          <Button
            variant="outline"
            className="h-auto flex-col items-start gap-2 p-4"
            onClick={() => {
              onSelectSms()
              onClose()
            }}
          >
            <div className="flex w-full items-center gap-3">
              <MessageSquare className="h-5 w-5" />
              <span className="font-medium">SMS</span>
            </div>
            <p className="text-left text-sm text-muted-foreground">
              Receive codes via text message. Standard message rates may apply.
            </p>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
