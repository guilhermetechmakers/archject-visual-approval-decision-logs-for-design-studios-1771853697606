import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Download, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PrivacyToc, PrivacyExportModal, PrivacyDeletionModal } from '@/components/privacy'
import { isAuthenticated } from '@/lib/auth-utils'

const POLICY_SECTIONS = [
  {
    id: 'what-we-collect',
    title: 'What We Collect',
    content: `We collect information you provide when creating an account (name, email, company), when using Archject (projects, decisions, approvals, comments, attachments), and when you contact support. We also collect technical data such as IP address, browser type, and usage patterns to operate and improve our services. Client data shared via approval links (e.g., client names, choices, timestamps) is stored as part of your Decision Logs.`,
  },
  {
    id: 'how-we-use',
    title: 'How We Use Your Data',
    content: `We use your data to provide, maintain, and improve Archject; to process approvals and generate Decision Logs; to communicate with you about your account and support requests; to enforce our terms and policies; and to comply with legal obligations. We do not sell your data or use it for third-party advertising.`,
  },
  {
    id: 'legal-bases',
    title: 'Legal Bases & Processors',
    content: `We process your data based on: (1) contract performance (providing the service you signed up for); (2) legitimate interests (security, fraud prevention, product improvement); (3) consent where required (e.g., marketing emails); and (4) legal obligation. We use sub-processors for hosting, email delivery, and analytics. A list of sub-processors is available upon request.`,
  },
  {
    id: 'storage-security',
    title: 'Storage, Security & Encryption',
    content: `Your data is stored in secure, geographically distributed data centers. All data in transit is protected with TLS 1.2+. Data at rest is encrypted using industry-standard encryption (AES-256). Access is controlled via authentication and role-based permissions. We regularly review our security practices and undergo third-party assessments.`,
  },
  {
    id: 'backups-recovery',
    title: 'Backups & Recovery',
    content: `We perform nightly encrypted backups of our systems. Backups are retained for 90 days and are stored with geographic replication. Restore procedures are tested regularly. For more details on backup cadence, retention, and restore SLAs, see our Security documentation. You can request an account export at any time via the "Request Account Export" button below or in Account Settings → Data.`,
  },
  {
    id: 'data-retention',
    title: 'Data Retention & Deletion',
    content: `We retain your data for as long as your account is active and as needed to provide our services. When you request account deletion, we schedule irreversible deletion after a 14-day hold window during which you may cancel. After deletion, backups that contain your data are retained until the backup retention period expires, after which they are purged. Some data may be retained longer where required by law.`,
  },
  {
    id: 'data-portability',
    title: 'Data Portability & Account Export',
    content: `You can request a full export of your account data at any time. Exports include your projects, decisions, approvals, comments, and attachments in machine-readable formats (JSON, CSV) and human-readable formats (PDF Decision Logs). Exports are typically ready within 24 hours and are available for download for 72 hours. Use the "Request Account Export" button below or go to Account Settings → Data.`,
  },
  {
    id: 'cookies-tracking',
    title: 'Cookies & Tracking',
    content: `We use essential cookies to operate the service (e.g., session management) and optional analytics cookies to understand usage patterns. You can manage cookie preferences in your browser or via our Cookie Settings. We do not use third-party advertising cookies.`,
  },
  {
    id: 'childrens-data',
    title: "Children's Data",
    content: `Archject is not intended for users under 16. We do not knowingly collect personal data from children. If you believe we have collected data from a child, please contact us at privacy@archject.com and we will delete it promptly.`,
  },
  {
    id: 'international-transfers',
    title: 'International Transfers',
    content: `Your data may be processed in countries outside your residence. We ensure appropriate safeguards (e.g., Standard Contractual Clauses) where required by law. By using Archject, you consent to such transfers as necessary to provide our services.`,
  },
  {
    id: 'contact-request',
    title: 'How to Contact Us / Make a Request',
    content: `To exercise your data subject rights (access, rectification, portability, deletion, restriction, objection) or to ask questions about this policy, contact us at privacy@archject.com or via our Support/Help Center. We aim to respond to privacy requests within 30 days. You may also lodge a complaint with your local data protection authority.`,
  },
  {
    id: 'changes',
    title: 'Changes to Policy',
    content: `We may update this Privacy Policy from time to time. We will notify you of material changes by email or via an in-app notice. The "Last updated" date at the bottom reflects the most recent revision. Continued use of Archject after changes constitutes acceptance of the updated policy.`,
  },
]

export function PrivacyPage() {
  const [exportOpen, setExportOpen] = useState(false)
  const [deletionOpen, setDeletionOpen] = useState(false)
  const authenticated = isAuthenticated()
  const navigate = useNavigate()

  useEffect(() => {
    document.title = 'Privacy Policy | Archject'
    const metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Archject Privacy Policy: how we collect, use, store, and protect your data. Your rights to access, export, and delete your data.')
    }
    // Structured data for SEO (ContactPoint)
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: 'Archject Privacy',
      description: 'Privacy Policy and data request contact',
      url: window.location.origin + '/privacy',
      mainEntity: {
        '@type': 'ContactPoint',
        email: 'privacy@archject.com',
        contactType: 'privacy',
        areaServed: 'Worldwide',
      },
    })
    document.head.appendChild(script)
    return () => {
      document.title = 'Archject - Visual Approval & Decision Logs for Design Studios'
      script.remove()
    }
  }, [])

  const handleExportClick = () => {
    if (authenticated) {
      setExportOpen(true)
    } else {
      navigate('/login', { state: { from: '/privacy', message: 'Sign in to request an account export.' } })
    }
  }

  const handleDeletionClick = () => {
    if (authenticated) {
      setDeletionOpen(true)
    } else {
      navigate('/login', { state: { from: '/privacy', message: 'Sign in to request account deletion.' } })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg">
        Skip to main content
      </a>

      <nav className="border-b border-border px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/" className="text-xl font-bold text-primary">
            Archject
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/help">
              <Button variant="ghost">Help</Button>
            </Link>
            <Link to="/privacy">
              <Button variant="ghost" className="text-primary font-medium">
                Privacy
              </Button>
            </Link>
            <Link to="/terms">
              <Button variant="ghost">Terms</Button>
            </Link>
            {authenticated ? (
              <Link to="/dashboard">
                <Button>Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost">Log in</Button>
                </Link>
                <Link to="/signup">
                  <Button>Sign up</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main id="main-content" className="mx-auto max-w-6xl px-4 py-12 lg:py-16">
        <div className="animate-in-up">
          <h1 className="text-[28px] font-semibold tracking-tight sm:text-3xl">
            Privacy Policy
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground leading-relaxed">
            Archject respects your privacy. This policy explains how we collect, use, store, and protect your data, and how you can exercise your rights to access, export, and delete your information.
          </p>

          {/* CTA area */}
          <div className="mt-8 flex flex-wrap gap-4">
            <Button
              onClick={handleExportClick}
              className="gap-2 btn-hover"
              size="lg"
            >
              <Download className="h-5 w-5" />
              Request Account Export
            </Button>
            <Button
              variant="outline"
              onClick={handleDeletionClick}
              className="gap-2 text-destructive border-destructive/50 hover:bg-destructive/10 hover:border-destructive"
              size="lg"
            >
              <Trash2 className="h-5 w-5" />
              Request Data Deletion
            </Button>
          </div>

          {!authenticated && (
            <p className="mt-4 text-sm text-muted-foreground">
              Sign in to request an export or deletion. Or contact{' '}
              <a href="mailto:privacy@archject.com" className="text-primary hover:underline">
                privacy@archject.com
              </a>{' '}
              for assistance.
            </p>
          )}
        </div>

        <div className="mt-12 lg:mt-16 flex flex-col lg:flex-row gap-12">
          <PrivacyToc />

          <div className="flex-1 min-w-0 space-y-6">
            {POLICY_SECTIONS.map((section) => (
              <Card
                key={section.id}
                id={section.id}
                className="card-hover scroll-mt-24"
              >
                <CardHeader>
                  <h2 className="text-[22px] font-semibold">{section.title}</h2>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed">
                    <p>{section.content}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Footer links */}
        <footer className="mt-16 pt-8 border-t border-border">
          <div className="flex flex-wrap gap-6 text-sm">
            <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors">
              Terms of Service
            </Link>
            <Link to="/help/article/security" className="text-muted-foreground hover:text-primary transition-colors">
              Security
            </Link>
            <Link to="/help" className="text-muted-foreground hover:text-primary transition-colors">
              Support
            </Link>
            <a href="mailto:privacy@archject.com" className="text-muted-foreground hover:text-primary transition-colors">
              Contact
            </a>
            <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
              Home
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Last updated: February 2025. Coordinate with legal counsel before publishing.
          </p>
        </footer>
      </main>

      <PrivacyExportModal open={exportOpen} onOpenChange={setExportOpen} />
      <PrivacyDeletionModal open={deletionOpen} onOpenChange={setDeletionOpen} />
    </div>
  )
}
