import { useState } from 'react'
import { toast } from 'sonner'
import { Copy, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

interface RecoveryCodesModalProps {
  open: boolean
  codes: string[]
  onClose: () => void
}

export function RecoveryCodesModal({ open, codes, onClose }: RecoveryCodesModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (codes.length === 0) return
    const text = codes.join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Recovery codes copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }

  const handleDownload = () => {
    if (codes.length === 0) return
    const text = codes.join('\n')
    const blob = new Blob([`Archject Recovery Codes\n\n${text}\n\nStore these safely. Each code can be used once.`], {
      type: 'text/plain',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'archject-recovery-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Recovery codes downloaded')
  }

  if (!open) return null

  return (
    <Dialog open={open}>
      <DialogContent onClose={onClose} showClose={true}>
        <DialogHeader>
          <DialogTitle>Save your recovery codes</DialogTitle>
          <DialogDescription>
            Store these codes safely. Each code can be used once to sign in if you lose access to your 2FA device.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <div className="grid grid-cols-2 gap-2 font-mono text-sm">
              {codes.map((code, i) => (
                <div key={i} className="rounded bg-background px-2 py-1">
                  {code}
                </div>
              ))}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Store these in a safe place. Each can be used once.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCopy} className="gap-2">
            <Copy className="h-4 w-4" />
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button variant="outline" onClick={handleDownload} className="gap-2">
            <Download className="h-4 w-4" />
            Download .txt
          </Button>
          <Button onClick={onClose}>I've saved these</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
