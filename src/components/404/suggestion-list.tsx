import {
  LayoutDashboard,
  FolderKanban,
  FileCheck,
  HelpCircle,
  ExternalLink,
} from 'lucide-react'
import { SuggestionCard } from './suggestion-card'
import { cn } from '@/lib/utils'

export interface SuggestionItem {
  to: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}

const DEFAULT_SUGGESTIONS: SuggestionItem[] = [
  {
    to: '/dashboard/overview',
    icon: LayoutDashboard,
    title: 'Dashboard',
    description: 'View your overview and recent activity',
  },
  {
    to: '/dashboard/projects',
    icon: FolderKanban,
    title: 'Projects',
    description: 'Browse and manage your projects',
  },
  {
    to: '/dashboard/decisions',
    icon: FileCheck,
    title: 'Decisions',
    description: 'See all decisions across projects',
  },
  {
    to: '/help',
    icon: HelpCircle,
    title: 'Help Center',
    description: 'Documentation, FAQs, and guides',
  },
  {
    to: '/',
    icon: ExternalLink,
    title: 'Home',
    description: 'Return to the landing page',
  },
]

export interface SuggestionListProps {
  suggestions?: SuggestionItem[]
  /** If path contains /projects/, prioritize Projects suggestion */
  attemptedPath?: string
  className?: string
}

export function SuggestionList({
  suggestions = DEFAULT_SUGGESTIONS,
  attemptedPath = '',
  className,
}: SuggestionListProps) {
  const ordered =
    attemptedPath.includes('/projects') || attemptedPath.includes('/project')
      ? [...suggestions].sort((a, b) => {
          if (a.to.includes('/projects')) return -1
          if (b.to.includes('/projects')) return 1
          return 0
        })
      : suggestions

  return (
    <ul className={cn('grid gap-3 sm:grid-cols-2', className)} role="list">
      {ordered.map((s) => (
        <li key={s.to}>
          <SuggestionCard
            to={s.to}
            icon={s.icon}
            title={s.title}
            description={s.description}
          />
        </li>
      ))}
    </ul>
  )
}
