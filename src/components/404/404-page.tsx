import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { log404 } from '@/lib/error-logging'
import { getUserIdFromToken } from '@/lib/auth-utils'
import { isAuthenticated } from '@/lib/auth-utils'
import { SearchBox } from './search-box'
import { SuggestionList } from './suggestion-list'
import { ReportBrokenLinkModal } from './report-broken-link-modal'
import { DiagnosticPanel } from './diagnostic-panel'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ContactForm } from '@/components/help'

function getSessionId(): string | null {
  try {
    let sid = sessionStorage.getItem('archject_session_id')
    if (!sid) {
      sid = crypto.randomUUID()
      sessionStorage.setItem('archject_session_id', sid)
    }
    return sid
  } catch {
    return null
  }
}

export function NotFound404Page() {
  const location = useLocation()
  const attemptedPath = location.pathname + location.search
  const [supportOpen, setSupportOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const hasLogged = useRef(false)

  useEffect(() => {
    document.title = '404 — Page not found · Archject'
  }, [])

  useEffect(() => {
    if (hasLogged.current) return
    hasLogged.current = true
    log404({
      attemptedPath,
      referrer: document.referrer || undefined,
      userId: getUserIdFromToken(),
      sessionId: getSessionId(),
    })
  }, [attemptedPath])

  const isAuth = isAuthenticated()

  return (
    <div
      className="min-h-screen bg-[#F7F7F9]"
      style={{ backgroundColor: 'rgb(247 247 249)' }}
    >
      <nav className="flex items-center justify-between border-b border-border bg-card px-4 py-4 sm:px-8">
        <Link to="/" className="text-xl font-bold text-primary">
          Archject
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/help">
            <Button variant="ghost" size="sm">
              Help
            </Button>
          </Link>
          {isAuth ? (
            <Link to="/dashboard/overview">
              <Button size="sm">Dashboard</Button>
            </Link>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link to="/signup">
                <Button size="sm">Sign up</Button>
              </Link>
            </>
          )}
        </div>
      </nav>

      <div className="mx-auto max-w-[900px] px-6 py-8 sm:px-8 sm:py-12">
        <main
          role="main"
          aria-labelledby="404-heading"
          className="animate-in-up"
        >
          <Card
            className="overflow-hidden shadow-[0px_2px_8px_rgba(0,0,0,0.03)]"
            style={{
              borderRadius: '10px',
              boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.03)',
            }}
          >
            <CardContent className="p-7 sm:p-9">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
                <div className="flex shrink-0">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                    <Compass className="h-7 w-7" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <h1
                    id="404-heading"
                    className="text-[28px] font-bold text-[#111827]"
                    style={{ color: 'rgb(17 24 39)' }}
                  >
                    404 — Page not found
                  </h1>
                  <p
                    className="mt-2 text-[15px] leading-relaxed text-[#6B7280]"
                    style={{ color: 'rgb(107 114 128)' }}
                    aria-live="polite"
                  >
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                    It may have been deleted, the URL might be incorrect, or you may have
                    followed an outdated link.
                  </p>

                  <div className="mt-6">
                    <SearchBox
                      placeholder="Search projects, decisions, clients…"
                      fallbackRoute={isAuth ? '/dashboard/overview' : '/'}
                    />
                  </div>

                  <div className="mt-6">
                    <p className="mb-3 text-sm font-medium text-foreground">
                      Suggested destinations
                    </p>
                    <SuggestionList attemptedPath={attemptedPath} />
                  </div>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link to={isAuth ? '/dashboard/overview' : '/'}>
                      <Button
                        size="lg"
                        className="rounded-lg px-5 py-3"
                        style={{
                          backgroundColor: 'rgb(0 82 204)',
                          color: 'white',
                        }}
                      >
                        Go to {isAuth ? 'Dashboard' : 'Home'}
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={() => setSupportOpen(true)}
                      className="underline-offset-4 hover:underline"
                    >
                      Contact support
                    </Button>
                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={() => setReportOpen(true)}
                      className="underline-offset-4 hover:underline"
                    >
                      Report broken link
                    </Button>
                  </div>

                  <div className="mt-6">
                    <DiagnosticPanel
                      attemptedPath={attemptedPath}
                      timestamp={new Date().toISOString()}
                      sessionId={getSessionId()}
                      userId={getUserIdFromToken()}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>

      <ContactForm
        open={supportOpen}
        onOpenChange={setSupportOpen}
        source="help-form"
        defaultSubject={`Broken link report: ${attemptedPath}`}
      />

      <ReportBrokenLinkModal
        open={reportOpen}
        onOpenChange={setReportOpen}
        attemptedPath={attemptedPath}
      />
    </div>
  )
}
