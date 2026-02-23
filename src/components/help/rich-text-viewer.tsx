import ReactMarkdown from 'react-markdown'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

interface RichTextViewerProps {
  content: string
  className?: string
}

export function RichTextViewer({ content, className }: RichTextViewerProps) {
  return (
    <div
      className={cn(
        'prose prose-sm max-w-none prose-headings:font-semibold prose-p:text-foreground prose-p:leading-relaxed',
        'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
        'prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm',
        'prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg',
        'prose-img:rounded-lg prose-img:border prose-img:border-border',
        className
      )}
    >
      <ReactMarkdown
        components={{
          h1: ({ children }) => {
            const text = String(children)
            return <h1 id={slugify(text)}>{children}</h1>
          },
          h2: ({ children }) => {
            const text = String(children)
            return <h2 id={slugify(text)}>{children}</h2>
          },
          h3: ({ children }) => {
            const text = String(children)
            return <h3 id={slugify(text)}>{children}</h3>
          },
          a: ({ href, children }) => {
            if (href?.startsWith('/')) {
              return (
                <Link to={href} className="text-primary hover:underline">
                  {children}
                </Link>
              )
            }
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                {children}
              </a>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
