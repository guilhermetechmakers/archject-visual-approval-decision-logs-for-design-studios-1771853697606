import { useState, useEffect, useCallback } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderKanban,
  FileCheck,
  FileStack,
  LayoutTemplate,
  Download,
  Bell,
  Settings,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Menu,
  HelpCircle,
  Search,
  ChevronDown,
  User,
  Users,
  Plug,
  Database,
  Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import { getDashboardProjects } from '@/api/dashboard'

const SIDEBAR_SECTIONS_KEY = 'archject-sidebar-sections'
const LAST_PROJECT_KEY = 'archject-last-project'

export function getLastProject(): string | null {
  try {
    return sessionStorage.getItem(LAST_PROJECT_KEY)
  } catch {
    return null
  }
}

export function setLastProject(projectId: string | null) {
  try {
    if (projectId) {
      sessionStorage.setItem(LAST_PROJECT_KEY, projectId)
    } else {
      sessionStorage.removeItem(LAST_PROJECT_KEY)
    }
  } catch {
    // ignore
  }
}

function getStoredSections(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(SIDEBAR_SECTIONS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, boolean>
      return parsed
    }
  } catch {
    // ignore
  }
  return {
    projects: true,
    decisions: true,
    templates: true,
    settings: false,
  }
}

function setStoredSections(sections: Record<string, boolean>) {
  try {
    localStorage.setItem(SIDEBAR_SECTIONS_KEY, JSON.stringify(sections))
  } catch {
    // ignore
  }
}

const mainNavItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/dashboard/search', icon: Search, label: 'Search' },
]

const projectsBaseItems = [
  { to: '/dashboard/projects', icon: FolderKanban, label: 'All Projects' },
]

const decisionsItems = [
  { to: '/dashboard/decisions', icon: FileCheck, label: 'All Decisions' },
]

const templatesItems = [
  { to: '/dashboard/templates', icon: LayoutTemplate, label: 'Templates Library' },
]

const settingsItems = [
  { to: '/dashboard/settings/profile', icon: User, label: 'Profile' },
  { to: '/dashboard/settings/team', icon: Users, label: 'Team' },
  { to: '/dashboard/settings/integrations', icon: Plug, label: 'Integrations' },
  { to: '/dashboard/settings/subscriptions', icon: CreditCard, label: 'Subscriptions' },
  { to: '/dashboard/settings/project-defaults', icon: Database, label: 'Project Defaults' },
  { to: '/dashboard/settings/backups', icon: Shield, label: 'Backups' },
  { to: '/dashboard/settings', icon: Settings, label: 'Settings' },
]

const bottomItems = [
  { to: '/dashboard/exports', icon: Download, label: 'Exports' },
  { to: '/dashboard/notifications', icon: Bell, label: 'Notifications' },
  { to: '/help', icon: HelpCircle, label: 'Help' },
  { to: '/dashboard/billing', icon: CreditCard, label: 'Billing' },
]

interface NavLinkProps {
  to: string
  icon: React.ElementType
  label: string
  collapsed?: boolean
  onClick?: () => void
  isActive?: boolean
  indent?: boolean
}

function NavLink({
  to,
  icon: Icon,
  label,
  collapsed,
  onClick,
  isActive,
  indent,
}: NavLinkProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        collapsed && 'justify-center px-2',
        indent && !collapsed && 'pl-9'
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden />
      {!collapsed && <span>{label}</span>}
    </Link>
  )
}

interface ExpandableSectionProps {
  id: string
  icon: React.ElementType
  label: string
  items: { to: string; icon: React.ElementType; label: string; subLabel?: string }[]
  collapsed: boolean
  expanded: boolean
  onToggle: () => void
  location: ReturnType<typeof useLocation>
  onMobileClose?: () => void
}

function ExpandableSection({
  id,
  icon: Icon,
  label,
  items,
  collapsed,
  expanded,
  onToggle,
  location,
  onMobileClose,
}: ExpandableSectionProps) {
  const isAnyActive = items.some(
    (item) =>
      location.pathname === item.to ||
      location.pathname.startsWith(item.to + '/')
  )

  return (
    <div className="space-y-1" role="group" aria-label={label}>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          isAnyActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          collapsed && 'justify-center px-2'
        )}
        aria-expanded={expanded}
        aria-controls={`sidebar-section-${id}`}
        id={`sidebar-trigger-${id}`}
      >
        <Icon className="h-5 w-5 shrink-0" aria-hidden />
        {!collapsed && (
          <>
            <span className="flex-1 text-left">{label}</span>
            <span
              className={cn(
                'transition-transform duration-200',
                expanded ? 'rotate-180' : ''
              )}
              aria-hidden
            >
              <ChevronDown className="h-4 w-4" />
            </span>
          </>
        )}
      </button>
      <div
        id={`sidebar-section-${id}`}
        role="region"
        aria-labelledby={`sidebar-trigger-${id}`}
        className={cn(
          'overflow-hidden transition-all duration-200 ease-in-out',
          expanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        {items.map((item) => {
          const isActive =
            location.pathname === item.to ||
            location.pathname.startsWith(item.to + '/')
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onMobileClose}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 pl-9 text-sm font-medium transition-colors duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" aria-hidden />
              <span>{item.label}</span>
              {item.subLabel && (
                <span className="ml-1 text-xs text-muted-foreground">
                  {item.subLabel}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function Sidebar({
  collapsed,
  onToggle,
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const location = useLocation()
  const { projectId } = useParams<{ projectId?: string }>()
  const [sections, setSections] = useState<Record<string, boolean>>(
    getStoredSections
  )

  useEffect(() => {
    if (projectId) {
      setLastProject(projectId)
    }
  }, [projectId])

  useEffect(() => {
    setStoredSections(sections)
  }, [sections])

  const toggleSection = useCallback((key: string) => {
    setSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }, [])

  const { data: projectsData } = useQuery({
    queryKey: ['dashboard-projects-sidebar'],
    queryFn: () => getDashboardProjects({ pageSize: 6 }),
    staleTime: 60 * 1000,
  })

  const recentProjects = projectsData?.items ?? []
  const lastProjectId = getLastProject()
  const projectsItems = [
    ...projectsBaseItems,
    ...recentProjects.map((p) => ({
      to: `/dashboard/projects/${p.id}`,
      icon: FolderKanban,
      label: p.name,
      subLabel: undefined as string | undefined,
    })),
  ]

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 lg:hidden',
          mobileOpen ? 'block opacity-100' : 'hidden opacity-0'
        )}
        onClick={onMobileClose}
        onKeyDown={(e) => e.key === 'Escape' && onMobileClose?.()}
        aria-hidden="true"
        role="presentation"
      />
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-border bg-secondary transition-all duration-300 ease-in-out',
          collapsed ? 'w-[72px]' : 'w-[240px]',
          'lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
          {!collapsed && (
            <Link
              to="/dashboard"
              className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg px-2 py-1"
            >
              <span className="text-xl font-bold text-primary">Archject</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="hidden lg:flex"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onMobileClose}
            className="lg:hidden"
            aria-label="Close menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {mainNavItems.map((item) => {
            const isActive =
              item.to === '/dashboard'
                ? location.pathname === '/dashboard' || location.pathname === '/dashboard/overview'
                : location.pathname === item.to || location.pathname.startsWith(item.to + '/')
            return (
              <NavLink
                key={item.to}
                to={item.to}
                icon={item.icon}
                label={item.label}
                collapsed={collapsed}
                onClick={onMobileClose}
                isActive={isActive}
              />
            )
          })}

          <ExpandableSection
            id="projects"
            icon={FolderKanban}
            label="Projects"
            items={projectsItems}
            collapsed={collapsed}
            expanded={sections.projects ?? true}
            onToggle={() => toggleSection('projects')}
            location={location}
            onMobileClose={onMobileClose}
          />

          <NavLink
            to={lastProjectId ? `/dashboard/projects/${lastProjectId}/library` : '/dashboard/projects'}
            icon={FileStack}
            label="Drawings & Specs"
            collapsed={collapsed}
            onClick={onMobileClose}
            isActive={location.pathname.includes('/library')}
          />

          <ExpandableSection
            id="decisions"
            icon={FileCheck}
            label="Decisions"
            items={decisionsItems}
            collapsed={collapsed}
            expanded={sections.decisions ?? true}
            onToggle={() => toggleSection('decisions')}
            location={location}
            onMobileClose={onMobileClose}
          />

          <ExpandableSection
            id="templates"
            icon={LayoutTemplate}
            label="Templates"
            items={templatesItems}
            collapsed={collapsed}
            expanded={sections.templates ?? true}
            onToggle={() => toggleSection('templates')}
            location={location}
            onMobileClose={onMobileClose}
          />

          <ExpandableSection
            id="settings"
            icon={Settings}
            label="Settings"
            items={settingsItems}
            collapsed={collapsed}
            expanded={sections.settings ?? false}
            onToggle={() => toggleSection('settings')}
            location={location}
            onMobileClose={onMobileClose}
          />
        </nav>

        <div className="shrink-0 border-t border-border p-4">
          {bottomItems.map((item) => {
            const isActive =
              location.pathname === item.to ||
              location.pathname.startsWith(item.to + '/')
            return (
              <NavLink
                key={item.to}
                to={item.to}
                icon={item.icon}
                label={item.label}
                collapsed={collapsed}
                onClick={onMobileClose}
                isActive={isActive}
              />
            )
          })}
        </div>
      </aside>
    </>
  )
}
