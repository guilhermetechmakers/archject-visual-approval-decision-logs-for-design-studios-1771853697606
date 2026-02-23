import { TeamRolesTable } from './team-roles-table'
import { SubscriptionManagementPanel } from './subscription-management-panel'

export function TeamPage() {
  return (
    <div className="space-y-6">
      <TeamRolesTable />
      <SubscriptionManagementPanel />
    </div>
  )
}
