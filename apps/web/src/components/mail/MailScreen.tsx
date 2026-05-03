'use client'

import { useState, useMemo, useCallback } from 'react'
import type { Mail, MailType } from './types'
import { DEMO_MAILS } from './mailData'
import { MailListItem } from './MailListItem'
import { MailDetail } from './MailDetail'
import { BulkActionBar } from './BulkActionBar'
import { MailEmptyState } from './MailEmptyState'

type FilterKey = 'all' | 'unread' | MailType

const FILTERS: { key: FilterKey; label: string; icon: string }[] = [
  { key: 'all', label: 'Tümü', icon: '📬' },
  { key: 'unread', label: 'Okunmamış', icon: '🔴' },
  { key: 'system', label: 'Sistem', icon: '📦' },
  { key: 'battle_report', label: 'Savaş', icon: '⚔️' },
  { key: 'guild', label: 'Lonca', icon: '🛡️' },
  { key: 'event', label: 'Etkinlik', icon: '✨' },
]

export function MailScreen() {
  const [mails, setMails] = useState<Mail[]>(DEMO_MAILS)
  const [activeMail, setActiveMail] = useState<Mail | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set())
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list')

  const unreadCount = useMemo(
    () => mails.filter((m) => !m.isRead).length,
    [mails]
  )

  const filteredMails = useMemo(() => {
    if (activeFilter === 'all') return mails
    if (activeFilter === 'unread') return mails.filter((m) => !m.isRead)
    return mails.filter((m) => m.type === activeFilter)
  }, [mails, activeFilter])

  const handleSelectMail = useCallback(
    (mail: Mail) => {
      setActiveMail(mail)
      setMobileView('detail')
      if (!mail.isRead) {
        setMails((prev) =>
          prev.map((m) => (m.id === mail.id ? { ...m, isRead: true } : m))
        )
      }
    },
    []
  )

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const handleClaim = useCallback((mailId: string) => {
    setClaimedIds((prev) => new Set(prev).add(mailId))
  }, [])

  const handleDelete = useCallback((mailId: string) => {
    setMails((prev) => prev.filter((m) => m.id !== mailId))
    setActiveMail((prev) => (prev?.id === mailId ? null : prev))
  }, [])

  const handleClaimSelected = useCallback(() => {
    setClaimedIds((prev) => {
      const next = new Set(prev)
      selectedIds.forEach((id) => next.add(id))
      return next
    })
    setSelectMode(false)
    setSelectedIds(new Set())
  }, [selectedIds])

  const handleDeleteSelected = useCallback(() => {
    setMails((prev) => prev.filter((m) => !selectedIds.has(m.id)))
    setActiveMail((prev) => (prev && selectedIds.has(prev.id) ? null : prev))
    setSelectMode(false)
    setSelectedIds(new Set())
  }, [selectedIds])

  const handleMarkReadSelected = useCallback(() => {
    setMails((prev) =>
      prev.map((m) => (selectedIds.has(m.id) ? { ...m, isRead: true } : m))
    )
    setSelectMode(false)
    setSelectedIds(new Set())
  }, [selectedIds])

  const hasClaimableSelected = useMemo(() => {
    return Array.from(selectedIds).some((id) => {
      const mail = mails.find((m) => m.id === id)
      return mail?.rewards?.length && !claimedIds.has(id)
    })
  }, [selectedIds, mails, claimedIds])

  const handleClaimAll = useCallback(() => {
    const ids = filteredMails
      .filter((m) => m.rewards?.length && !claimedIds.has(m.id))
      .map((m) => m.id)
    setClaimedIds((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.add(id))
      return next
    })
  }, [filteredMails, claimedIds])

  const claimableCount = filteredMails.filter(
    (m) => m.rewards?.length && !claimedIds.has(m.id)
  ).length

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--color-bg)',
        fontFamily: 'var(--font-body)',
      }}
    >
      {/* ── Top bar ─────────────────────────────────────────── */}
      <header
        style={{
          padding: '16px 20px 0',
          background: 'var(--color-bg-surface)',
          borderBottom: '1px solid var(--color-border)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }} aria-hidden>📬</span>
            <h1
              style={{
                fontSize: 17,
                fontWeight: 800,
                letterSpacing: '0.08em',
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-display)',
              }}
            >
              POSTA
            </h1>
            {unreadCount > 0 && (
              <UnreadBadge count={unreadCount} />
            )}
          </div>

          <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
            {claimableCount > 0 && (
              <button
                onClick={handleClaimAll}
                aria-label={`Tüm ödülleri talep et (${claimableCount})`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '6px 12px',
                  borderRadius: 20,
                  border: '1px solid rgba(255,200,50,0.4)',
                  background: 'rgba(255,200,50,0.1)',
                  color: 'var(--color-energy)',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  transition: 'all 0.25s cubic-bezier(0.32,0.72,0,1)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                <span aria-hidden>📥</span>
                Hepsini Talep Et
                <span
                  style={{
                    background: 'var(--color-energy)',
                    color: '#0a0a0a',
                    borderRadius: 10,
                    padding: '0 5px',
                    fontSize: 10,
                    fontWeight: 800,
                  }}
                >
                  {claimableCount}
                </span>
              </button>
            )}

            <button
              onClick={() => {
                setSelectMode((v) => !v)
                setSelectedIds(new Set())
              }}
              aria-pressed={selectMode}
              aria-label={selectMode ? 'Seçim modundan çık' : 'Seçim modu'}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: `1px solid ${selectMode ? 'var(--color-brand)' : 'var(--color-border)'}`,
                background: selectMode ? 'var(--color-brand-dim)' : 'var(--color-bg-elevated)',
                color: selectMode ? 'var(--color-brand)' : 'var(--color-text-muted)',
                cursor: 'pointer',
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              title="Toplu seçim"
            >
              ☑
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <nav
          aria-label="Posta filtresi"
          style={{
            display: 'flex',
            gap: 2,
            overflowX: 'auto',
            scrollbarWidth: 'none',
            paddingBottom: 0,
          }}
        >
          {FILTERS.map(({ key, label, icon }) => {
            const count =
              key === 'all'
                ? mails.length
                : key === 'unread'
                ? mails.filter((m) => !m.isRead).length
                : mails.filter((m) => m.type === key).length
            const isActive = activeFilter === key
            return (
              <button
                key={key}
                onClick={() => setActiveFilter(key)}
                aria-current={isActive ? 'page' : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '7px 12px',
                  borderRadius: '8px 8px 0 0',
                  border: isActive ? '1px solid var(--color-border)' : '1px solid transparent',
                  borderBottom: isActive ? '2px solid var(--color-brand)' : '2px solid transparent',
                  background: isActive ? 'var(--color-bg-elevated)' : 'transparent',
                  color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: isActive ? 700 : 500,
                  letterSpacing: '0.03em',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s cubic-bezier(0.32,0.72,0,1)',
                  flexShrink: 0,
                }}
              >
                <span aria-hidden style={{ fontSize: 13 }}>{icon}</span>
                {label}
                {count > 0 && key === 'unread' && (
                  <span
                    style={{
                      background: 'var(--color-danger)',
                      color: '#fff',
                      borderRadius: 10,
                      padding: '0 5px',
                      fontSize: 9,
                      fontWeight: 800,
                      lineHeight: '16px',
                    }}
                    aria-label={`${count} okunmamış`}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </header>

      {/* ── Content split ───────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Mail list panel */}
        <div
          style={{
            width: activeMail ? '38%' : '100%',
            minWidth: activeMail ? 220 : 'unset',
            borderRight: activeMail ? '1px solid var(--color-border)' : 'none',
            overflowY: 'auto',
            overflowX: 'hidden',
            display: mobileView === 'detail' ? 'none' : 'block',
            position: 'relative',
            paddingBottom: selectMode ? 60 : 0,
            transition: 'width 0.35s cubic-bezier(0.32,0.72,0,1)',
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--color-border) transparent',
          }}
          // Show list on md+ always
          className="md:!block"
        >
          {filteredMails.length === 0 ? (
            <MailEmptyState activeFilter={activeFilter} />
          ) : (
            filteredMails.map((mail) => (
              <MailListItem
                key={mail.id}
                mail={mail}
                isActive={activeMail?.id === mail.id}
                isSelected={selectedIds.has(mail.id)}
                selectMode={selectMode}
                onClick={() => handleSelectMail(mail)}
                onToggleSelect={() => handleToggleSelect(mail.id)}
              />
            ))
          )}

          {/* Bulk action bar (overlays bottom of list) */}
          {selectMode && selectedIds.size > 0 && (
            <BulkActionBar
              selectedCount={selectedIds.size}
              hasClaimable={hasClaimableSelected}
              onClaimSelected={handleClaimSelected}
              onDeleteSelected={handleDeleteSelected}
              onMarkRead={handleMarkReadSelected}
              onCancel={() => {
                setSelectMode(false)
                setSelectedIds(new Set())
              }}
            />
          )}
        </div>

        {/* Mail detail panel */}
        {activeMail ? (
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              display: mobileView === 'list' ? 'none' : 'flex',
              flexDirection: 'column',
              scrollbarWidth: 'thin',
              scrollbarColor: 'var(--color-border) transparent',
            }}
            className="md:!flex"
          >
            <MailDetail
              mail={activeMail}
              onClose={() => setMobileView('list')}
              onClaim={handleClaim}
              onDelete={handleDelete}
              claimedIds={claimedIds}
            />
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 10,
              color: 'var(--color-text-muted)',
            }}
            className="hidden md:flex"
            aria-hidden
          >
            <span style={{ fontSize: 32 }}>✉️</span>
            <p style={{ fontSize: 12, letterSpacing: '0.05em' }}>Okumak için bir posta seçin</p>
          </div>
        )}
      </div>
    </div>
  )
}

function UnreadBadge({ count }: { count: number }) {
  return (
    <div
      aria-label={`${count} okunmamış posta`}
      style={{
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        background: 'var(--color-danger)',
        color: '#fff',
        fontSize: 10,
        fontWeight: 800,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 5px',
        boxShadow: '0 0 8px rgba(255,68,68,0.6)',
        animation: 'glow-pulse 2s ease-in-out infinite',
        fontFamily: 'var(--font-display)',
      }}
    >
      {count}
    </div>
  )
}
