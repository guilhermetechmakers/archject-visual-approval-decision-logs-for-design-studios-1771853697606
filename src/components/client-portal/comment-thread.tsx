import { useState } from 'react'
import { MessageSquare, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { PortalComment } from '@/types/portal'

export interface CommentThreadProps {
  comments: PortalComment[]
  onPostComment: (content: string, parentCommentId?: string) => void
  isLoading?: boolean
  className?: string
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

function CommentItem({
  comment,
  depth,
  onPostReply,
}: {
  comment: PortalComment
  depth: number
  onPostReply: (parentId: string, content: string) => void
}) {
  const [showReply, setShowReply] = useState(false)
  const [replyContent, setReplyContent] = useState('')

  const handleSendReply = () => {
    if (replyContent.trim()) {
      onPostReply(comment.id, replyContent.trim())
      setReplyContent('')
      setShowReply(false)
    }
  }

  return (
    <div
      className={cn('flex gap-3', depth > 0 && 'ml-6 mt-2 border-l-2 border-[rgb(229,231,235)] pl-4')}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgb(0,82,204)]/10 text-sm font-medium text-[rgb(0,82,204)]">
        {(comment.authorName ?? '?')[0]}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[rgb(17,24,39)]">
            {comment.authorName ?? 'Unknown'}
          </span>
          <span className="text-xs text-[rgb(107,114,128)]">
            {formatTimestamp(comment.createdAt)}
          </span>
        </div>
        <p className="mt-1 text-sm text-[rgb(17,24,39)]">{comment.content}</p>
        {!comment.parentCommentId && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 h-8 text-xs text-[rgb(107,114,128)]"
            onClick={() => setShowReply(!showReply)}
          >
            Reply
          </Button>
        )}
        {showReply && (
          <div className="mt-2 space-y-2">
            <Textarea
              placeholder="Write a reply..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              className="min-h-[80px] rounded-lg border-[rgb(209,213,219)]"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSendReply} disabled={!replyContent.trim()}>
                Send
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowReply(false)
                  setReplyContent('')
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function CommentThread({
  comments,
  onPostComment,
  isLoading,
  className,
}: CommentThreadProps) {
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)

  const rootComments = comments.filter((c) => !c.parentCommentId)
  const getReplies = (parentId: string) =>
    comments.filter((c) => c.parentCommentId === parentId)

  const handlePost = (parentId?: string) => {
    const text = content.trim()
    if (!text) return
    setPosting(true)
    onPostComment(text, parentId)
    setContent('')
    setPosting(false)
  }

  const handlePostReply = (parentId: string, replyContent: string) => {
    onPostComment(replyContent, parentId)
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-[rgb(107,114,128)]" />
        <h3 className="text-base font-semibold text-[rgb(17,24,39)]">
          Comments
        </h3>
      </div>

      <div className="space-y-2">
        <Textarea
          placeholder="Add a comment or type @ to mention someone..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[100px] rounded-lg border-[rgb(209,213,219)]"
          disabled={isLoading}
        />
        <Button
          size="sm"
          onClick={() => handlePost()}
          disabled={!content.trim() || posting}
          className="bg-[rgb(0,82,204)]"
        >
          <Send className="mr-2 h-4 w-4" />
          Send comment
        </Button>
      </div>

      <div className="space-y-4">
        {rootComments.length === 0 ? (
          <p className="py-4 text-center text-sm text-[rgb(107,114,128)]">
            No comments yet. Be the first to add one.
          </p>
        ) : (
          rootComments.map((comment) => (
            <div key={comment.id}>
              <CommentItem
                comment={comment}
                depth={0}
                onPostReply={handlePostReply}
              />
              {getReplies(comment.id).map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  depth={1}
                  onPostReply={handlePostReply}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
