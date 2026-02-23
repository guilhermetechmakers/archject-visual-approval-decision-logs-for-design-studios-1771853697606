import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { KbArticle } from '@/api/help'

interface ArticleListItemProps {
  article: KbArticle
  className?: string
}

export function ArticleListItem({ article, className }: ArticleListItemProps) {
  return (
    <Link
      to={`/help/article/${article.slug}`}
      className={cn(
        'group flex flex-col gap-2 rounded-xl border border-border bg-card p-6 shadow-card transition-all duration-200',
        'hover:shadow-card-hover hover:-translate-y-0.5 hover:border-primary/20',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-foreground group-hover:text-primary">{article.title}</h3>
          {article.excerpt && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {article.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            <span className="text-xs text-muted-foreground">
              Updated {new Date(article.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground group-hover:text-primary" />
      </div>
      <span className="text-sm text-primary font-medium">
        Read more
      </span>
    </Link>
  )
}
