import { BrandingPanel } from './branding-panel'
import { EmailTemplateEditor } from './email-template-editor'

export function SettingsIndex() {
  return (
    <div className="space-y-6">
      <BrandingPanel />
      <EmailTemplateEditor />
    </div>
  )
}
