import { BackupRecoveryPanel } from './backup-recovery-panel'

export function BackupsPage() {
  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold">Backups</h1>
        <p className="mt-1 text-muted-foreground">
          Schedule backups, trigger on-demand exports, and download archives
        </p>
      </div>
      <BackupRecoveryPanel />
    </div>
  )
}
