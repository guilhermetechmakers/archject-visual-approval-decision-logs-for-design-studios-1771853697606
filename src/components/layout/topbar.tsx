import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Search, Download, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NotificationsBell } from '@/components/dashboard/notifications-bell'
import { UserMenu } from '@/components/auth/user-menu'

interface TopbarProps {
  onMenuClick?: () => void
  showMenuButton?: boolean
  className?: string
}

export function Topbar({
  onMenuClick,
  showMenuButton = true,
  className,
}: TopbarProps) {
  const navigate = useNavigate()

  const handleSearchClick = () => {
    navigate('/dashboard/search')
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === '/') {
      e.preventDefault()
      navigate('/dashboard/search')
    }
  }

  const handleQuickExport = () => {
    navigate('/dashboard/exports')
  }

  const handleHelp = () => {
    navigate('/help')
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'e' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault()
        navigate('/dashboard/exports')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate])

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-card px-4 lg:px-8',
        'shadow-[0_1px_0_0_rgb(229,231,235)]',
        className
      )}
      role="banner"
    >
      {showMenuButton && (
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden shrink-0"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </Button>
      )}

      <div className="relative flex-1 max-w-md">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          placeholder="Search projects, decisions... (Press / to search)"
          className="pl-9 cursor-pointer rounded-lg border-input focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label="Search projects and decisions"
          onClick={handleSearchClick}
          onKeyDown={handleSearchKeyDown}
          readOnly
        />
      </div>

      <div className="flex items-center gap-1" role="group" aria-label="Global actions">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleQuickExport}
          className="shrink-0"
          aria-label="Quick export (Ctrl+Shift+E)"
          title="Quick export (Ctrl+Shift+E)"
        >
          <Download className="h-5 w-5 text-muted-foreground" aria-hidden />
        </Button>
        <NotificationsBell />
        <Button
          variant="ghost"
          size="icon"
          onClick={handleHelp}
          className="shrink-0"
          aria-label="Help"
          title="Help"
        >
          <HelpCircle className="h-5 w-5 text-muted-foreground" aria-hidden />
        </Button>
        <UserMenu />
      </div>
    </header>
  )
}
