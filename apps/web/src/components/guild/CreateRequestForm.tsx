'use client'

import { FormEvent, useState } from 'react'
import clsx from 'clsx'
import type { CreateRequestResult } from '@/lib/guild-client'
import type { GuildResource } from '@/types/guild'
import { resourceIcon, resourceLabel } from './formatters'

interface CreateRequestFormProps {
  requestsRemaining: number
  onCreate: (input: { resource: GuildResource; amount: number }) => Promise<CreateRequestResult>
}

const PRESETS = [100, 250, 500]

export function CreateRequestForm({ requestsRemaining, onCreate }: CreateRequestFormProps) {
  const [resource, setResource] = useState<GuildResource>('mineral')
  const [amount, setAmount] = useState(250)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const exhausted = requestsRemaining <= 0

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy || exhausted) return
    setBusy(true)
    setError(null)
    const res = await onCreate({ resource, amount })
    setBusy(false)
    if (res.ok) {
      setOpen(false)
      setAmount(250)
    } else if (res.reason === 'limit') {
      setError('Günlük talep limitine ulaştın')
    } else {
      setError('Talep oluşturulamadı')
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className={clsx('btn-primary w-full text-xs py-2.5', exhausted && 'opacity-50 cursor-not-allowed')}
        onClick={() => setOpen(true)}
        disabled={exhausted}
        aria-describedby="create-req-hint"
      >
        + Yardım Talebi Oluştur
        {exhausted && <span id="create-req-hint" className="block text-[10px] mt-0.5 normal-case font-normal">Günlük limit doldu</span>}
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-lg p-4 border border-border-hover"
      style={{ background: 'var(--color-bg-elevated)' }}
      aria-label="Yardım talebi oluştur"
    >
      <h3 className="font-display text-xs font-bold tracking-widest uppercase text-text-primary">
        Yeni Yardım Talebi
      </h3>

      <fieldset>
        <legend className="form-label">Kaynak</legend>
        <div className="flex gap-2" role="radiogroup">
          {(['mineral', 'gas'] as GuildResource[]).map((r) => (
            <button
              type="button"
              key={r}
              role="radio"
              aria-checked={resource === r}
              onClick={() => setResource(r)}
              className={clsx(
                'flex-1 rounded-lg px-3 py-2 text-sm font-display font-bold uppercase tracking-wider border transition-all',
                resource === r
                  ? 'border-brand bg-brand-dim text-brand'
                  : 'border-border text-text-secondary hover:border-border-hover',
              )}
            >
              <span className="mr-1" aria-hidden>{resourceIcon(r)}</span>
              {resourceLabel(r)}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="req-amount" className="form-label">
          Miktar
        </label>
        <input
          id="req-amount"
          type="number"
          min={1}
          max={500}
          value={amount}
          onChange={(e) => setAmount(Math.max(1, Math.min(500, Number(e.target.value) || 0)))}
          className="form-input text-sm"
        />
        <div className="flex gap-1.5 mt-2">
          {PRESETS.map((p) => (
            <button
              type="button"
              key={p}
              onClick={() => setAmount(p)}
              className={clsx(
                'btn-ghost text-[11px] px-2 py-1 flex-1',
                amount === p && 'border-brand text-brand',
              )}
            >
              {p}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-text-muted mt-1">
          Maks: depo kapasitesinin %2'si veya 500 (hangisi düşükse)
        </p>
      </div>

      {error && (
        <p className="text-[11px] text-status-danger" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button type="button" className="btn-ghost text-xs flex-1" onClick={() => setOpen(false)} disabled={busy}>
          İptal
        </button>
        <button type="submit" className="btn-primary text-xs flex-1 py-2" disabled={busy || exhausted}>
          {busy ? 'Oluşturuluyor...' : 'Yayınla'}
        </button>
      </div>
    </form>
  )
}
