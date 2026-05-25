'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import Link from 'next/link'
import {
  Caption,
  Chip,
  Eyebrow,
  NDButton,
  Panel,
  Screen,
  Sigil,
  ND,
  useNDRace,
  type NDRace,
} from '@/components/handoff'
import type { Mail, MailType } from './types'
import { DEMO_MAILS } from './mailData'
import { MailListItem } from './MailListItem'
import { MailDetail } from './MailDetail'
import { BulkActionBar } from './BulkActionBar'
import { MailEmptyState } from './MailEmptyState'
import { hasSession } from '@/lib/session'

type FilterKey = 'all' | 'unread' | MailType

const FILTERS: { key: FilterKey; label: string; icon: string }[] = [
  { key: 'all',           label: 'Tümü',       icon: '📬' },
  { key: 'unread',        label: 'Okunmamış',  icon: '🔴' },
  { key: 'system',        label: 'Sistem',     icon: '📦' },
  { key: 'battle_report', label: 'Savaş',      icon: '⚔️' },
  { key: 'guild',         label: 'Lonca',      icon: '🛡️' },
  { key: 'event',         label: 'Etkinlik',   icon: '✨' },
]

export function MailScreen() {
  const race = useNDRace()
  // Empty default — SSR-safe (hasSession is window-gated).  We swap in
  // DEMO_MAILS only for true guests after hydration so logged-in players
  // see an honest empty inbox until the live /mail endpoint lands. Without
  // this every fresh account opened the inbox to find 6 fake messages
  // including a guild-mail they had no guild for, and a "Hepsi" claim
  // button granting rewards that never reached the wallet — a major
  // trust-break in the first ~5 minutes.
  const [mails, setMails] = useState<Mail[]>([])
  useEffect(() => {
    if (!hasSession()) setMails(DEMO_MAILS)
  }, [])
  const [activeMail, setActiveMail] = useState<Mail | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set())
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list')

  const unreadCount = useMemo(
    () => mails.filter((m) => !m.isRead).length,
    [mails],
  )

  const filteredMails = useMemo(() => {
    if (activeFilter === 'all') return mails
    if (activeFilter === 'unread') return mails.filter((m) => !m.isRead)
    return mails.filter((m) => m.type === activeFilter)
  }, [mails, activeFilter])

  const handleSelectMail = useCallback((mail: Mail) => {
    setActiveMail(mail)
    setMobileView('detail')
    if (!mail.isRead) {
      setMails((prev) =>
        prev.map((m) => (m.id === mail.id ? { ...m, isRead: true } : m)),
      )
    }
  }, [])

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
      prev.map((m) => (selectedIds.has(m.id) ? { ...m, isRead: true } : m)),
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
    (m) => m.rewards?.length && !claimedIds.has(m.id),
  ).length

  return (
    <Screen race={race} style={{ minHeight: '100dvh' }}>
      {/* ── Header ────────────────────────────────────────────── */}
      <header
        style={{
          padding: '14px 18px 0',
          background: `linear-gradient(180deg, rgba(6,8,15,0.92) 0%, rgba(6,8,15,0.55) 100%)`,
          borderBottom: `1px solid ${race.primary}33`,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 12,
          }}
        >
          <Link
            href="/dashboard"
            aria-label="Geri"
            style={iconBtn()}
          >
            ‹
          </Link>
          <Sigil race={race} size={28} glow />
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <Eyebrow color={race.primary}>İLETİŞİM AĞI</Eyebrow>
            <div
              style={{
                marginTop: 2,
                fontFamily: ND.display,
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                color: ND.text,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              Posta
              {unreadCount > 0 && <UnreadBadge count={unreadCount} />}
            </div>
          </div>

          {claimableCount > 0 && (
            <NDButton
              race={race}
              variant="outline"
              size="sm"
              onClick={handleClaimAll}
              icon={<span aria-hidden>📥</span>}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                Hepsi
                <Chip color={ND.warn}>{claimableCount}</Chip>
              </span>
            </NDButton>
          )}

          <button
            type="button"
            onClick={() => {
              setSelectMode((v) => !v)
              setSelectedIds(new Set())
            }}
            aria-pressed={selectMode}
            aria-label={selectMode ? 'Seçim modundan çık' : 'Seçim modu'}
            title="Toplu seçim"
            style={{
              width: 32,
              height: 32,
              border: `1px solid ${selectMode ? race.primary : ND.border}`,
              background: selectMode ? `${race.primary}1f` : ND.surface,
              color: selectMode ? race.primary : ND.textDim,
              cursor: 'pointer',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              fontFamily: ND.display,
              clipPath:
                'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
              boxShadow: selectMode ? `0 0 8px ${race.glow}55` : 'none',
            }}
          >
            ☑
          </button>
        </div>

        {/* Filter tabs */}
        <nav
          aria-label="Posta filtresi"
          style={{
            display: 'flex',
            gap: 4,
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
                type="button"
                onClick={() => setActiveFilter(key)}
                aria-current={isActive ? 'page' : undefined}
                style={tabStyle(isActive, race)}
              >
                <span aria-hidden style={{ fontSize: 12 }}>{icon}</span>
                {label}
                {count > 0 && key === 'unread' && (
                  <Chip color={ND.danger} style={{ padding: '0 5px' }}>
                    {count}
                  </Chip>
                )}
              </button>
            )
          })}
        </nav>
      </header>

      {/* ── Content split ─────────────────────────────────────── */}
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
            minWidth: activeMail ? 240 : 'unset',
            borderRight: activeMail ? `1px solid ${ND.border}` : 'none',
            overflowY: 'auto',
            overflowX: 'hidden',
            display: mobileView === 'detail' ? 'none' : 'block',
            position: 'relative',
            paddingBottom: selectMode ? 64 : 0,
            transition: 'width 0.35s cubic-bezier(0.32,0.72,0,1)',
            scrollbarWidth: 'thin',
            scrollbarColor: `${ND.border} transparent`,
            background: `linear-gradient(180deg, transparent, rgba(0,0,0,0.15))`,
          }}
          className="md:!block"
        >
          {filteredMails.length === 0 ? (
            <MailEmptyState activeFilter={activeFilter} race={race} />
          ) : (
            filteredMails.map((mail) => (
              <MailListItem
                key={mail.id}
                mail={mail}
                isActive={activeMail?.id === mail.id}
                isSelected={selectedIds.has(mail.id)}
                selectMode={selectMode}
                race={race}
                onClick={() => handleSelectMail(mail)}
                onToggleSelect={() => handleToggleSelect(mail.id)}
              />
            ))
          )}

          {selectMode && selectedIds.size > 0 && (
            <BulkActionBar
              selectedCount={selectedIds.size}
              hasClaimable={hasClaimableSelected}
              race={race}
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
              scrollbarColor: `${ND.border} transparent`,
            }}
            className="md:!flex"
          >
            <MailDetail
              mail={activeMail}
              race={race}
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
              gap: 12,
              color: ND.textMute,
              padding: 24,
            }}
            className="hidden md:flex"
            aria-hidden
          >
            <Panel
              race={race}
              style={{
                width: 88,
                height: 88,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 32,
              }}
            >
              ✉️
            </Panel>
            <Caption>Okumak için bir posta seçin</Caption>
          </div>
        )}
      </div>
    </Screen>
  )
}

/* ── helpers ──────────────────────────────────────────────────────────── */

function iconBtn(): React.CSSProperties {
  return {
    width: 32,
    height: 32,
    border: `1px solid ${ND.border}`,
    background: ND.surface,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: ND.text,
    fontFamily: ND.display,
    fontSize: 18,
    textDecoration: 'none',
    clipPath:
      'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
  }
}

function tabStyle(on: boolean, race: NDRace): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '8px 12px',
    fontFamily: ND.display,
    fontSize: 10,
    letterSpacing: '0.10em',
    textTransform: 'uppercase',
    background: on
      ? `linear-gradient(180deg, ${race.primary}28, ${race.primary}10)`
      : 'transparent',
    border: `1px solid ${on ? race.primary : ND.border}`,
    color: on ? race.primary : ND.textDim,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s cubic-bezier(0.32,0.72,0,1)',
    flexShrink: 0,
    clipPath:
      'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)',
    boxShadow: on ? `0 0 10px ${race.glow}33` : 'none',
  }
}

function UnreadBadge({ count }: { count: number }) {
  return (
    <div
      aria-label={`${count} okunmamış posta`}
      style={{
        minWidth: 20,
        height: 18,
        background: ND.danger,
        color: '#fff',
        fontSize: 10,
        fontWeight: 800,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 6px',
        boxShadow: `0 0 8px ${ND.danger}88`,
        fontFamily: ND.display,
        letterSpacing: '0.04em',
        clipPath:
          'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)',
      }}
    >
      {count}
    </div>
  )
}
