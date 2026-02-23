import { Link, useNavigate } from 'react-router-dom'
import { MoreHorizontal, ExternalLink, Share2, Archive } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { DashboardProjectItem } from '@/api/dashboard'

export interface ProjectCardProps {
  project: DashboardProjectItem
  className?: string
}

function formatLastActivity(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return date.toLocaleDateString()
}

export function ProjectCard({ project, className }: ProjectCardProps) {
  const navigate = useNavigate()
  return (
    <Card
      className={cn(
        'card-hover group overflow-hidden transition-all duration-200',
        className
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: project.colorAccent || 'rgb(var(--primary))' }}
                aria-hidden
              />
              <Link
                to={`/dashboard/projects/${project.id}`}
                className="font-semibold text-foreground hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
              >
                {project.name}
              </Link>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatLastActivity(project.lastActivity)}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {project.status}
              </Badge>
              {project.pendingApprovals > 0 && (
                <Badge variant="warning">
                  {project.pendingApprovals} pending
                </Badge>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 opacity-70 transition-opacity group-hover:opacity-100"
                aria-label="Project actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/dashboard/projects/${project.id}`)}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Open
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/dashboard/projects/${project.id}`)}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}
