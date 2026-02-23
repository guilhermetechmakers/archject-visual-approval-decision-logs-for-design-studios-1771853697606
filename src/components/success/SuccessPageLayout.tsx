import { cn } from '@/lib/utils'

export interface SuccessPageLayoutProps {
  children: React.ReactNode
  className?: string
}

export function SuccessPageLayout({ children, className }: SuccessPageLayoutProps) {
  return (
    <div
      className={cn(
        'min-h-screen bg-[#F7F7F9] px-4 py-8 sm:px-6 lg:px-8',
        className
      )}
    >
      <div className="mx-auto max-w-2xl">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-12">
          {children}
        </div>
      </div>
    </div>
  )
}
