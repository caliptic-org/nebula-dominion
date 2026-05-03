'use client'

import { useEffect, useRef } from 'react'
import { useGuildChat } from '@/hooks/useGuildChat'
import { GUILD_LIMITS } from '@/lib/guild-client'
import { MessageInput } from './MessageInput'
import { MessageItem } from './MessageItem'
import type { GuildMember } from '@/types/guild'

interface GuildChatPanelProps {
  guildId: string | null
  me: { id: string; name: string; role: GuildMember['role'] }
}

export function GuildChatPanel({ guildId, me }: GuildChatPanelProps) {
  const { messages, loading, send, mute, report, isOfficer, cooldownMs, perMinuteRemaining, perMinuteCap, lastError } =
    useGuildChat({ guildId, me })
  const listRef = useRef<HTMLOListElement>(null)
  const stickToBottom = useRef(true)

  useEffect(() => {
    if (!listRef.current || !stickToBottom.current) return
    listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages])

  const onScroll = () => {
    const el = listRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight)
    stickToBottom.current = distanceFromBottom < 80
  }

  return (
    <section
      className="glass-card flex flex-col h-full min-h-[420px]"
      aria-labelledby="guild-chat-heading"
    >
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-base" aria-hidden>
            💬
          </span>
          <h2 id="guild-chat-heading" className="font-display text-sm font-bold text-text-primary tracking-widest uppercase">
            Lonca Chat
          </h2>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-text-muted">
          <span className="badge badge-brand" title={`Son ${GUILD_LIMITS.MESSAGE_WINDOW} mesaj görünüyor`}>
            {messages.length}/{GUILD_LIMITS.MESSAGE_WINDOW}
          </span>
          {isOfficer && <span className="badge badge-energy">Subay modu</span>}
        </div>
      </header>

      <ol
        ref={listRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5"
        aria-live="polite"
        aria-relevant="additions"
        aria-busy={loading}
      >
        {loading && (
          <li className="text-center text-text-muted text-xs py-8">Mesajlar yükleniyor...</li>
        )}
        {!loading && messages.length === 0 && (
          <li className="text-center text-text-muted text-xs py-8">Henüz mesaj yok. Sohbeti başlat!</li>
        )}
        {messages.map((m) => (
          <MessageItem
            key={m.id}
            message={m}
            isOwn={m.authorId === me.id}
            isOfficer={isOfficer}
            onMute={mute}
            onReport={report}
          />
        ))}
      </ol>

      <footer className="border-t border-border px-3 py-3">
        <MessageInput
          cooldownMs={cooldownMs}
          perMinuteRemaining={perMinuteRemaining}
          perMinuteCap={perMinuteCap}
          lastError={lastError}
          onSend={send}
        />
      </footer>
    </section>
  )
}
