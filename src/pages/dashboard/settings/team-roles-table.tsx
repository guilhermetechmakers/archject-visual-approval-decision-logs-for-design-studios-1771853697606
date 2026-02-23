import { useState } from 'react'
import { UserPlus, MoreVertical, User } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type Role = 'owner' | 'admin' | 'billing' | 'member' | 'viewer'

interface TeamMember {
  id: string
  email: string
  name: string
  role: Role
  status: 'active' | 'pending'
}

const mockMembers: TeamMember[] = [
  { id: '1', email: 'owner@studio.com', name: 'Jane Owner', role: 'owner', status: 'active' },
  { id: '2', email: 'admin@studio.com', name: 'Admin User', role: 'admin', status: 'active' },
  { id: '3', email: 'member@studio.com', name: 'Team Member', role: 'member', status: 'active' },
]

function RoleBadge({ role }: { role: Role }) {
  const config: Record<Role, { variant: 'default' | 'secondary' | 'outline'; label: string }> = {
    owner: { variant: 'default', label: 'Owner' },
    admin: { variant: 'default', label: 'Admin' },
    billing: { variant: 'secondary', label: 'Billing' },
    member: { variant: 'outline', label: 'Member' },
    viewer: { variant: 'outline', label: 'Viewer' },
  }
  const { variant, label } = config[role] ?? config.member
  return <Badge variant={variant}>{label}</Badge>
}

export function TeamRolesTable() {
  const [members] = useState<TeamMember[]>(mockMembers)
  const [, setInviteOpen] = useState(false)

  return (
    <Card className="card-hover">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Team & roles</CardTitle>
          <CardDescription>
            Invite members and manage permissions. Owners and Billing admins can manage billing.
          </CardDescription>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite member
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left font-medium p-4">Member</th>
                  <th className="text-left font-medium p-4">Role</th>
                  <th className="text-left font-medium p-4">Status</th>
                  <th className="w-12 p-4" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{m.name}</p>
                          <p className="text-muted-foreground">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <RoleBadge role={m.role} />
                    </td>
                    <td className="p-4">
                      <Badge variant={m.status === 'active' ? 'success' : 'warning'}>
                        {m.status}
                      </Badge>
                    </td>
                    <td className="p-4">
                      {m.role !== 'owner' && (
                        <Button variant="ghost" size="icon" aria-label="More options">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Owners and Billing admins can manage subscriptions, payment methods, and view full invoices.
        </p>
      </CardContent>
    </Card>
  )
}
