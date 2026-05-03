'use client'

import clsx from 'clsx'
import { formatRelativeShort, roleLabel } from './formatters'
import type { GuildMessage } from '@/types/guild'

interface MessageItemProps {
  message: GuildMessage
  isOwn: boolean
  isOfficer: boolean
  onMute: (authorId: string) => void
  onReport: (messageId: string) => void
}

export function MessageItem({ message, isOwn, isOfficer, onMute, onReport }: MessageItemProps) {
  if (message.system) {
    return (
      <li className="text-xs text-text-muted text-center py-1 italic">
        {message.content}
      </li>
    )
  }

  return (
    <li
      className={clsx(
        'group flex gap-3 py-2 px-2 rounded-lg transition-colors',
        message.flagged && 'bg-status-danger/10 border border-status-danger/30',
        message.mutedAuthor && 'opacity-50',
        !message.flagged && !message.mutedAuthor && 'hover:bg-bg-elevated/40',
      )}
    >
      <div
        className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold font-display"
        style={{
          background: 'var(--color-bg-elevated)',
          color: 'var(--color-text-primary)',
          border: `1px solid ${message.authorRole === 'leader' ? 'var(--color-energy)' : message.authorRole === 'officer' ? 'var(--color-accent)' : 'var(--color-border)'}`,
        }}
        aria-hidden
      >
        {message.authorName.slice(0, 1).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className={clsx('font-display text-xs font-bold', isOwn ? 'text-brand' : 'text-text-primary')}>
            {message.authorName}
          </span>
          {(message.authorRole === 'leader' || message.authorRole === 'officer') && (
            <span
              className="badge"
              style={{
                background: message.authorRole === 'leader' ? 'var(--color-energy-dim)' : 'var(--color-accent-dim)',
                color: message.authorRole === 'leader' ? 'var(--color-energy)' : 'var(--color-accent)',
                borderColor: message.authorRole === 'leader' ? 'var(--color-energy)' : 'var(--color-accent)',
              }}
            >
              {roleLabel(message.authorRole)}
            </span>
          )}
          <span className="text-text-muted text-[10px] tabular-nums">
            {formatRelativeShort(message.createdAt)}
          </span>
          {message.flagged && (
            <span className="badge" style={{ background: 'rgba(255,51,85,0.12)', color: 'var(--color-danger)', borderColor: 'rgba(255,51,85,0.4)' }}>
              Bildirildi
            </span>
          )}
        </div>
        <p className="text-text-secondary text-sm break-words mt-0.5">{message.content}</p>
      </div>
      {isOfficer && !isOwn && (
        <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onMute(message.authorId)}
            disabled={message.mutedAuthor}
            className="btn-ghost text-[10px] px-2 py-1"
            aria-label={`${message.authorName} kullanıcısını sustur`}
          >
            🔇 Sustur
          </button>
          <button
            type="button"
            onClick={() => onReport(message.id)}
            disabled={message.flagged}
            className="btn-ghost text-[10px] px-2 py-1"
            aria-label="Mesajı bildir"
          >
            🚩 Bildir
          </button>
        </div>
      )}
    </li>
  )
}
