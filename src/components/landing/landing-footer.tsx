import { Link } from 'react-router-dom'
import { NewsletterSignupForm } from '../landing/newsletter-signup-form'

const FOOTER_LINKS = [
  { to: '/help', label: 'Help' },
  { to: '/about', label: 'About' },
  { to: '/privacy', label: 'Privacy Policy' },
  { to: '/terms', label: 'Terms of Service' },
  { to: '/help', label: 'Contact' },
] as const

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-card/50 py-12">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-12 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Link to="/" className="text-xl font-bold text-primary">
              Archject
            </Link>
            <p className="mt-2 text-sm text-muted-foreground">
              Visual approval & decision logs for design studios.
            </p>
            <div className="mt-6">
              <NewsletterSignupForm />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Product</h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link to="/#features" className="text-sm text-muted-foreground hover:text-foreground">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/#how-it-works" className="text-sm text-muted-foreground hover:text-foreground">
                  How it works
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/signup" className="text-sm text-muted-foreground hover:text-foreground">
                  Sign up
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Company</h3>
            <ul className="mt-4 space-y-2">
              {FOOTER_LINKS.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-muted-foreground hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <span className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Archject. All rights reserved.
          </span>
          <div className="flex gap-6">
            <Link to="/auth?tab=login" className="text-sm text-muted-foreground hover:text-foreground">
              Log in
            </Link>
            <Link to="/signup" className="text-sm text-muted-foreground hover:text-foreground">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
