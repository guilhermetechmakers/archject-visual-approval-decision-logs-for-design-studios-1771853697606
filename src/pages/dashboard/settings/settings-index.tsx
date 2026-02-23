import { BrandingPanel } from './branding-panel'
import { SubscriptionManagementPanel } from './subscription-management-panel'

export function SettingsIndex() {
  return (
    <div className="space-y-6">
      <BrandingPanel />
      <SubscriptionManagementPanel />
    </div>
  )
}
