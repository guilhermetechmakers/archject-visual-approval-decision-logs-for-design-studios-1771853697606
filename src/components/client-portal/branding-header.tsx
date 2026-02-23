import { cn } from '@/lib/utils'
import type { PortalBranding } from '@/types/portal'

export interface BrandingHeaderProps {
  branding?: PortalBranding | null
  projectName?: string
  instructions?: string
  className?: string
}

export function BrandingHeader({
  branding,
  projectName,
  instructions,
  className,
}: BrandingHeaderProps) {
  const logoUrl = branding?.logoUrl
  const primaryColor = branding?.primaryColor ?? '#0052CC'

  return (
    <header
      className={cn(
        'flex flex-col gap-3 border-b border-[rgb(229,231,235)] bg-[#FFFFFF] px-4 py-4 sm:px-6',
        className
      )}
    >
      <div className="flex items-center gap-3">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Studio logo"
            className="h-10 w-auto max-w-[140px] object-contain"
          />
        ) : (
          <span
            className="text-lg font-bold"
            style={{ color: primaryColor }}
          >
            Archject
          </span>
        )}
        {projectName && (
          <span className="text-sm text-[rgb(107,114,128)]">• {projectName}</span>
        )}
      </div>
      {instructions && (
        <p className="text-sm text-[rgb(107,114,128)]">{instructions}</p>
      )}
    </header>
  )
}
