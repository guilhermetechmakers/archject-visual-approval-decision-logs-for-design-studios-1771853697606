import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Palette,
  Users,
  CreditCard,
  Plug,
  Image,
  Mail,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

export function SettingsPage() {
  const [tab, setTab] = useState('branding')
  const [studioName, setStudioName] = useState('Acme Design Studio')
  const [logoUrl, setLogoUrl] = useState('')
  const [accentColor, setAccentColor] = useState('#0052CC')

  return (
    <div className="space-y-8 animate-in">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight">Settings & Team Management</h1>
        <p className="mt-1 text-muted-foreground">
          Studio configuration, branding, team roles, and integrations
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="branding" className="gap-2">
            <Palette className="h-4 w-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="subscription" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Subscription
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <Plug className="h-4 w-4" />
            Integrations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-5 w-5 text-muted-foreground" />
                  Branding
                </CardTitle>
                <CardDescription>
                  Customize how your studio appears on invoices and emails
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="studio-name">Studio name</Label>
                  <Input
                    id="studio-name"
                    value={studioName}
                    onChange={(e) => setStudioName(e.target.value)}
                    placeholder="Acme Design Studio"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logo">Logo URL</Label>
                  <Input
                    id="logo"
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accent">Invoice accent color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="accent"
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="h-10 w-14 cursor-pointer p-1"
                    />
                    <Input
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                <Button>Save branding</Button>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  Invoice template preview
                </CardTitle>
                <CardDescription>
                  Preview how invoices will look with your branding
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-border bg-muted/30 p-6">
                  <div className="flex items-center gap-3 border-b border-border pb-4">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="h-10 object-contain" />
                    ) : (
                      <div className="flex h-10 w-24 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                        Logo
                      </div>
                    )}
                    <span className="font-semibold">{studioName || 'Studio name'}</span>
                  </div>
                  <div
                    className="mt-4 h-2 rounded"
                    style={{ backgroundColor: accentColor }}
                  />
                  <p className="mt-4 text-sm text-muted-foreground">
                    Invoice content will appear here with your branding applied.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <Card className="card-hover">
            <CardHeader>
              <div className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    Team roles & permissions
                  </CardTitle>
                  <CardDescription>
                    Invite members and manage who can access billing and settings
                  </CardDescription>
                </div>
                <Button>Invite team member</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-3 text-left font-medium">Member</th>
                      <th className="px-4 py-3 text-left font-medium">Role</th>
                      <th className="px-4 py-3 text-left font-medium">Permissions</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <p className="font-medium">You</p>
                        <p className="text-muted-foreground">your@email.com</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="success">Owner</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        Full access, billing, team management
                      </td>
                      <td className="px-4 py-3 text-right">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Only Owners and Billing Admins can manage subscription and payment methods.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription" className="mt-6">
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                Subscription management
              </CardTitle>
              <CardDescription>
                View and manage your subscription, payment methods, and invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/dashboard/billing">
                <Button className="w-full sm:w-auto">
                  Open Billing & Pricing
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="mt-6">
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plug className="h-5 w-5 text-muted-foreground" />
                Integrations
              </CardTitle>
              <CardDescription>
                Connect external services and enable/disable connectors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: 'Slack', description: 'Get notifications in Slack', enabled: false },
                  { name: 'Email', description: 'Transactional emails', enabled: true },
                  { name: 'Export API', description: 'Programmatic export access', enabled: false },
                ].map((int) => (
                  <div
                    key={int.name}
                    className="flex items-center justify-between rounded-lg border border-border p-4"
                  >
                    <div>
                      <p className="font-medium">{int.name}</p>
                      <p className="text-sm text-muted-foreground">{int.description}</p>
                    </div>
                    <Button variant={int.enabled ? 'outline' : 'default'} size="sm">
                      {int.enabled ? 'Disable' : 'Enable'}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
