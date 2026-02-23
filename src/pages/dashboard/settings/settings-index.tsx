import { BrandingPanel } from './branding-panel'
import { EmailTemplateEditor } from './email-template-editor'
import { SubscriptionManagementPanel } from './subscription-management-panel'

export function SettingsIndex() {
  return (
    <div className="space-y-6">
      <BrandingPanel />
      <EmailTemplateEditor />
      <SubscriptionManagementPanel />
    </div>
  )
}
