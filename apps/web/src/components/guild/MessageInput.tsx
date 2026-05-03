'use client'

import { FormEvent, useState } from 'react'
import clsx from 'clsx'
import type { SendResult } from '@/lib/guild-client'

interface MessageInputProps {
  cooldownMs: number
  perMinuteRemaining: number
  perMinuteCap: number
  lastError: SendResult | null
  onSend: (content: string) => Promise<SendResult>
}

const MAX_LEN = 280

export function MessageInput({ cooldownMs, perMinuteRemaining, perMinuteCap, lastError, onSend }: MessageInputProps) {
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const cooldownActive = cooldownMs > 0
  const minuteLimited = perMinuteRemaining <= 0
  const remaining = MAX_LEN - value.length

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!value.trim() || busy || cooldownActive || minuteLimited) return
    setBusy(true)
    const res = await onSend(value)
    setBusy(false)
    if (res.ok) setValue('')
  }

  const errorText = (() => {
    if (cooldownActive) return `Cooldown: ${(cooldownMs / 1000).toFixed(1)}s`
    if (minuteLimited) return 'Dakika başına mesaj limitine ulaştın'
    if (!lastError) return null
    if (lastError.reason === 'profanity') return 'Mesaj içerik filtresine takıldı'
    if (lastError.reason === 'muted') return 'Bu kanalda susturulmuşsun'
    return null
  })()

  return (
    <form onSubmit={handleSubmit} className="space-y-2" aria-label="Lonca chat mesaj yaz">
      <div className="flex gap-2 items-end">
        <label htmlFor="guild-msg" className="sr-only">
          Mesaj
        </label>
        <textarea
          id="guild-msg"
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, MAX_LEN))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit(e as unknown as FormEvent)
            }
          }}
          rows={1}
          placeholder="Lonca kanalına yaz... (Enter gönder, Shift+Enter satır)"
          className="form-input resize-none flex-1 min-h-[44px] max-h-32 text-sm"
          aria-describedby="guild-msg-hint"
          aria-invalid={!!errorText}
          disabled={busy}
        />
        <button
          type="submit"
          className="btn-primary text-xs px-4 py-2.5 shrink-0"
          disabled={busy || cooldownActive || minuteLimited || !value.trim()}
          aria-label="Gönder"
        >
          Gönder
        </button>
      </div>
      <div id="guild-msg-hint" className="flex items-center justify-between text-[11px]">
        <span
          className={clsx('font-mono', errorText ? 'text-status-danger' : 'text-text-muted')}
          role={errorText ? 'alert' : undefined}
        >
          {errorText ?? `Dakika içi kalan: ${perMinuteRemaining}/${perMinuteCap}`}
        </span>
        <span className={clsx('font-mono', remaining < 32 ? 'text-status-warning' : 'text-text-muted')}>
          {remaining}
        </span>
      </div>
    </form>
  )
}
