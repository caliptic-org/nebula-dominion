'use client';

import { useState, useRef, useEffect, type CSSProperties } from 'react';
import Link from 'next/link';
import {
  RACES,
  ND,
  Screen,
  Panel,
  Eyebrow,
  Caption,
  Code,
  NDButton,
  toast,
  useNDRace,
  type NDRace,
  type NDRaceKey,
} from '@/components/handoff';
import { BottomNav } from '@/components/ui/BottomNav';
import { api, FetchError } from '@/lib/api';
import { useChatChannel, type ChatChannelMessage } from '@/hooks/useChatChannel';

/* ── Types ─────────────────────────────────────────────────────────────── */

type ChatTab = 'global' | 'guild' | 'dm';

interface ChatMessage {
  id: string;
  type: 'player' | 'system' | 'battle' | 'guild';
  author?: string;
  race?: NDRaceKey;
  level?: number;
  content: string;
  timestamp: string;
  isOwn?: boolean;
}

interface DMConversation {
  id: string;
  author: string;
  race: NDRaceKey;
  level: number;
  lastMessage: string;
  timestamp: string;
  unread: number;
  online: boolean;
}

/* ── Constants ─────────────────────────────────────────────────────────── */

const RACE_ICONS: Record<NDRaceKey, string> = {
  insan:   '⚡',
  zerg:    '🦠',
  otomat:  '🤖',
  canavar: '🔥',
  seytan:  '👁',
};

const QUICK_REPLIES = [
  'Saldırıyorum!',
  'Yardım lazım!',
  'GG!',
  'İttifak kuralım',
  'Harika oyun!',
  'Savunmaya çekiliyorum',
];

const EMOJIS = ['⚔️','🔥','💎','🛡️','⚡','🌌','👑','💀','✨','🎯','🏆','💥'];

/* ── Demo Data ─────────────────────────────────────────────────────────── */

const GLOBAL_MESSAGES: ChatMessage[] = [
  {
    id: 'sys-1',
    type: 'battle',
    content: '⚔️ Komutan Voss (İnsan) sektör 7-Alpha\'yı ele geçirdi!',
    timestamp: '14:22',
  },
  {
    id: 'msg-1',
    type: 'player',
    author: 'Morgath_X',
    race: 'zerg',
    level: 47,
    content: 'Sektör 7 kimin kontrolünde? İttifak teklifim var.',
    timestamp: '14:23',
  },
  {
    id: 'msg-2',
    type: 'player',
    author: 'DemUrgePrime',
    race: 'otomat',
    level: 62,
    content: 'Holografik ağımız bölgeyi taradı. Koordinatlar: X:447 Y:892. Dikkatli olun.',
    timestamp: '14:24',
  },
  {
    id: 'sys-2',
    type: 'system',
    content: '🌌 Yeni çağ etkinliği başladı: Nebula Kalkanı — 2 saat kaldı',
    timestamp: '14:24',
  },
  {
    id: 'msg-3',
    type: 'player',
    author: 'Khorvash',
    race: 'canavar',
    level: 38,
    content: 'GG! Herkes hazır mı? Büyük saldırıyı başlatıyoruz.',
    timestamp: '14:25',
  },
  {
    id: 'msg-4',
    type: 'player',
    author: 'Sen',
    race: 'insan',
    level: 55,
    content: 'Koordinatları aldım. Saldırıya katılıyorum!',
    timestamp: '14:25',
    isOwn: true,
  },
  {
    id: 'msg-5',
    type: 'player',
    author: 'Malphas',
    race: 'seytan',
    level: 71,
    content: 'Karanlık güçler bu savaşa dahil. İttifaklara inanmıyorum ama... bu sefer.',
    timestamp: '14:26',
  },
  {
    id: 'sys-3',
    type: 'battle',
    content: '💀 Lonca "Iron Veil" sektör 12\'yi kaybetti!',
    timestamp: '14:27',
  },
];

const GUILD_MESSAGES: ChatMessage[] = [
  {
    id: 'g-sys-1',
    type: 'guild',
    content: '🤝 Yeni üye katıldı: Reyes_Alpha [İnsan Lvl.24]',
    timestamp: '13:45',
  },
  {
    id: 'g-1',
    type: 'player',
    author: 'GuildMaster_Voss',
    race: 'insan',
    level: 88,
    content: 'Lonca toplantısı bu gece 20:00\'da. Tüm üyeler katılsın.',
    timestamp: '13:48',
  },
  {
    id: 'g-2',
    type: 'player',
    author: 'Aurelius',
    race: 'otomat',
    level: 55,
    content: 'Kaynak transferi hazır. Kim almak istiyor?',
    timestamp: '13:52',
  },
  {
    id: 'g-3',
    type: 'player',
    author: 'Sen',
    race: 'insan',
    level: 55,
    content: 'Kaynak transferini alıyorum, teşekkürler!',
    timestamp: '13:54',
    isOwn: true,
  },
  {
    id: 'g-sys-2',
    type: 'guild',
    content: '🏆 Lonca "Nebula Knights" haftalık sıralamada 3. sıraya yükseldi!',
    timestamp: '14:00',
  },
];

const DM_CONVERSATIONS: DMConversation[] = [
  {
    id: 'dm-1',
    author: 'Threnix',
    race: 'zerg',
    level: 43,
    lastMessage: 'Yarın savaşa hazır mısın?',
    timestamp: '14:20',
    unread: 2,
    online: true,
  },
  {
    id: 'dm-2',
    author: 'Aurelius',
    race: 'otomat',
    level: 55,
    lastMessage: 'Kaynak transferini tamamladım.',
    timestamp: '13:54',
    unread: 0,
    online: true,
  },
  {
    id: 'dm-3',
    author: 'Lilithra',
    race: 'seytan',
    level: 66,
    lastMessage: 'Paktı düşün... güçlü olacak.',
    timestamp: '12:30',
    unread: 1,
    online: false,
  },
  {
    id: 'dm-4',
    author: 'Kovacs',
    race: 'insan',
    level: 31,
    lastMessage: 'GG önceki maçta!',
    timestamp: '11:15',
    unread: 0,
    online: false,
  },
];

/* ── Sub-components ────────────────────────────────────────────────────── */

function RaceBadge({ raceKey, size = 'sm' }: { raceKey: NDRaceKey; size?: 'xs' | 'sm' }) {
  const r = RACES[raceKey];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        fontFamily: ND.display,
        fontWeight: 800,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        fontSize: size === 'xs' ? 7 : 8,
        padding: size === 'xs' ? '1px 4px' : '2px 5px',
        background: `${r.primary}18`,
        color: r.primary,
        border: `1px solid ${r.primary}35`,
        borderRadius: 2,
      }}
    >
      {RACE_ICONS[raceKey]} {r.short}
    </span>
  );
}

function MessageAvatar({
  author,
  raceKey,
  isOwn,
}: {
  author: string;
  raceKey: NDRaceKey;
  isOwn?: boolean;
}) {
  const r = RACES[raceKey];
  const initials = author.slice(0, 2).toUpperCase();
  return (
    <div
      style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        background: `${r.primary}18`,
        border: `2px solid ${r.primary}55`,
        color: r.primary,
        fontFamily: ND.display,
        fontWeight: 800,
        fontSize: 10,
        userSelect: 'none',
        borderRadius: 3,
        boxShadow: isOwn ? `0 0 8px ${r.glow}40` : undefined,
      }}
    >
      {initials}
    </div>
  );
}

function MessageBubble({
  message,
  myRace,
}: {
  message: ChatMessage;
  myRace: NDRace;
}) {
  const isOwn = message.isOwn;

  if (message.type === 'system') {
    return (
      <SystemLine
        content={message.content}
        timestamp={message.timestamp}
        color={RACES.otomat.primary}
        tint="rgba(120, 200, 255, 0.06)"
      />
    );
  }

  if (message.type === 'battle') {
    return (
      <SystemLine
        content={message.content}
        timestamp={message.timestamp}
        color={ND.danger}
        tint="rgba(255, 80, 80, 0.08)"
      />
    );
  }

  if (message.type === 'guild') {
    return (
      <SystemLine
        content={message.content}
        timestamp={message.timestamp}
        color={ND.warn}
        tint="rgba(220, 180, 60, 0.07)"
      />
    );
  }

  const bubbleRace = isOwn ? myRace : (message.race ? RACES[message.race] : myRace);
  const bubbleColor = bubbleRace.primary;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 8,
        padding: '4px 12px',
        flexDirection: isOwn ? 'row-reverse' : 'row',
      }}
    >
      {!isOwn && <MessageAvatar author={message.author!} raceKey={message.race!} />}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          maxWidth: '70%',
          alignItems: isOwn ? 'flex-end' : 'flex-start',
        }}
      >
        {!isOwn && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 4px' }}>
            <span
              style={{
                fontFamily: ND.display,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.04em',
                color: bubbleColor,
              }}
            >
              {message.author}
            </span>
            {message.race && <RaceBadge raceKey={message.race} size="xs" />}
            {message.level && (
              <span style={{ fontFamily: ND.mono, fontSize: 9, color: ND.textMute }}>
                Lv.{message.level}
              </span>
            )}
          </div>
        )}

        <div
          style={{
            position: 'relative',
            padding: '8px 12px',
            fontFamily: ND.body,
            fontSize: 12,
            lineHeight: 1.45,
            color: ND.text,
            background: isOwn
              ? `linear-gradient(135deg, ${bubbleColor}22 0%, ${bubbleColor}10 100%)`
              : ND.surface,
            border: `1.5px solid ${bubbleColor}${isOwn ? '60' : '30'}`,
            borderRadius: isOwn ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
            boxShadow: isOwn
              ? `0 0 12px ${bubbleColor}20, inset 0 0 0 1px ${bubbleColor}10`
              : '0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: 0,
              [isOwn ? 'right' : 'left']: 0,
              width: 6,
              height: 6,
              background: bubbleColor,
              opacity: 0.5,
              borderRadius: isOwn ? '0 0 0 6px' : '0 0 6px 0',
              pointerEvents: 'none',
            }}
          />
          {message.content}
        </div>

        <span
          style={{
            fontFamily: ND.mono,
            fontSize: 9,
            color: ND.textMute,
            padding: '0 4px',
          }}
        >
          {message.timestamp}
        </span>
      </div>

      {isOwn && <MessageAvatar author="Sen" raceKey={myRace.key} isOwn />}
    </div>
  );
}

function SystemLine({
  content,
  timestamp,
  color,
  tint,
}: {
  content: string;
  timestamp: string;
  color: string;
  tint: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        margin: '4px 8px',
        padding: '6px 12px',
        fontFamily: ND.body,
        fontSize: 11,
        background: tint,
        border: `1px solid ${color}30`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 3,
        color,
      }}
    >
      <span style={{ opacity: 0.85 }}>{content}</span>
      <span
        style={{
          marginLeft: 'auto',
          fontFamily: ND.mono,
          fontSize: 9,
          color: ND.textMute,
          flexShrink: 0,
        }}
      >
        {timestamp}
      </span>
    </div>
  );
}

function DMListItem({ conv, onClick }: { conv: DMConversation; onClick: () => void }) {
  const r = RACES[conv.race];
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        textAlign: 'left',
        background: 'transparent',
        border: 'none',
        borderBottom: `1px solid ${ND.border}`,
        cursor: 'pointer',
        transition: 'background 0.2s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = 'rgba(120,160,220,0.06)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = 'transparent';
      }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            background: `${r.primary}18`,
            border: `2px solid ${r.primary}55`,
            color: r.primary,
            fontFamily: ND.display,
            fontWeight: 800,
            fontSize: 10,
            borderRadius: 3,
          }}
        >
          {conv.author.slice(0, 2).toUpperCase()}
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: conv.online ? ND.ok : ND.textMute,
            border: `2px solid ${ND.bg}`,
          }}
        />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span
            style={{
              fontFamily: ND.display,
              fontSize: 11,
              fontWeight: 700,
              color: ND.text,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {conv.author}
          </span>
          <RaceBadge raceKey={conv.race} size="xs" />
        </div>
        <Caption style={{ fontSize: 11, color: ND.textMute, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {conv.lastMessage}
        </Caption>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        <Code style={{ fontSize: 9 }}>{conv.timestamp}</Code>
        {conv.unread > 0 && (
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 999,
              fontFamily: ND.display,
              fontWeight: 800,
              fontSize: 9,
              minWidth: 16,
              height: 16,
              padding: '0 4px',
              background: ND.danger,
              color: '#0A0E1A',
            }}
          >
            {conv.unread}
          </span>
        )}
      </div>
    </button>
  );
}

/* ── Main Component ────────────────────────────────────────────────────── */

export default function ChatPage() {
  const race = useNDRace();
  const [activeTab, setActiveTab] = useState<ChatTab>('global');
  const [input, setInput] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [newMessageAlert, setNewMessageAlert] = useState(false);
  const [activeDM, setActiveDM] = useState<DMConversation | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);

  /* Local optimistic messages per tab, persisted to localStorage so the
   * player's drafts survive navigate-away-and-back. Layered on top of the
   * static mock arrays + the live `/chat/:channel` server feed below.
   * Drafts get filtered out of the render path once the server echoes the
   * same message back (matched by content + 60s window) to avoid the
   * "ghost duplicate" effect during the poll latency. */
  const [draftsByTab, setDraftsByTab] = useState<Record<ChatTab, ChatMessage[]>>(() => {
    if (typeof window === 'undefined') return { global: [], guild: [], dm: [] };
    try {
      const raw = window.localStorage.getItem('nebula:chat:drafts:v1');
      if (raw) return JSON.parse(raw) as Record<ChatTab, ChatMessage[]>;
    } catch { /* ignore — bad JSON or private mode */ }
    return { global: [], guild: [], dm: [] };
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('nebula:chat:drafts:v1', JSON.stringify(draftsByTab));
    } catch { /* quota / private mode — silently OK */ }
  }, [draftsByTab]);

  // Live /chat/:channel server feed for the active tab. The hook polls
  // every 5s; we lift the channel only when the player is on a chattable
  // tab (`global` / `guild`) — DM lives in its own conversation panel.
  const liveChannel: 'global' | 'guild' | null =
    activeTab === 'global' || activeTab === 'guild' ? activeTab : null;
  const { data: liveChat, refresh: refreshChat } = useChatChannel(liveChannel);

  // Convert backend rows → the ChatMessage shape the UI expects.
  const serverMessages: ChatMessage[] = (liveChat?.messages ?? []).map((m: ChatChannelMessage) => {
    // The stub `race` is whatever the JWT carried; map to a known key when
    // it matches, otherwise fall back to insan so the bubble still renders.
    const raceKey: NDRaceKey =
      m.race === 'insan' || m.race === 'zerg' || m.race === 'otomat' ||
      m.race === 'canavar' || m.race === 'seytan'
        ? (m.race as NDRaceKey)
        : 'insan';
    return {
      id: m.id,
      type: activeTab === 'guild' ? 'guild' : 'player',
      author: m.username,
      race: raceKey,
      content: m.content,
      timestamp: new Date(m.timestamp).toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    } as ChatMessage;
  });

  const baseMessages = activeTab === 'global' ? GLOBAL_MESSAGES : GUILD_MESSAGES;
  const tabDrafts = draftsByTab[activeTab] ?? [];
  // De-dup: drop a local draft once the server has echoed back a message
  // with the same content — without this the optimistic line lingers next
  // to the server-confirmed copy after the next 5s poll. Content match is
  // a coarse but sufficient heuristic for the short 5s window.
  const dedupedDrafts = tabDrafts.filter(
    (d) => !serverMessages.some((s) => s.content === d.content),
  );
  const messages: ChatMessage[] = [...baseMessages, ...serverMessages, ...dedupedDrafts];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeTab, activeDM]);

  useEffect(() => {
    if (activeTab !== 'global') return;
    const timer = setTimeout(() => {
      setNewMessageAlert(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, [activeTab]);

  async function handleSend() {
    const text = input.trim();
    if (!text) return;
    // Optimistic local append: even with the live POST below, we want the
    // player's bubble on screen instantly rather than waiting for the
    // server round-trip + next 5s poll. The de-dup filter above drops the
    // local copy once the server echoes back the same content.
    const optimistic: ChatMessage = {
      id: `local-${Date.now()}`,
      author: 'Sen',
      content: text,
      timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      type: activeTab === 'guild' ? 'guild' : 'player',
      race: undefined,
      isOwn: true,
    };
    setDraftsByTab((cur) => ({
      ...cur,
      [activeTab]: [...(cur[activeTab] ?? []), optimistic],
    }));
    setInput('');
    setShowEmoji(false);
    setShowQuickReplies(false);

    // Only global / guild have a backend channel for now (DM uses its own
    // pseudo-conversation flow). Skip the POST silently when the user is
    // on the DM tab — the optimistic line in their drafts stays put.
    if (activeTab !== 'global' && activeTab !== 'guild') return;

    try {
      await api.post(`/chat/${activeTab}`, { content: text });
      // Eagerly re-pull so the player sees their server-stamped copy
      // without waiting for the next 5s poll tick.
      refreshChat();
    } catch (err) {
      const msg = err instanceof FetchError ? err.message : 'Mesaj gönderilemedi';
      toast.error(msg);
    }
  }

  const tabs: { id: ChatTab; label: string; icon: string; badge?: number }[] = [
    { id: 'global', label: 'Global', icon: '🌌' },
    { id: 'guild',  label: 'Lonca',  icon: '🤝', badge: 3 },
    { id: 'dm',     label: 'Özel',   icon: '📨', badge: DM_CONVERSATIONS.reduce((n, c) => n + c.unread, 0) },
  ];

  return (
    <Screen race={race} style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: 'linear-gradient(180deg, rgba(6,8,15,0.95), rgba(6,8,15,0.55))',
          borderBottom: `1px solid ${race.primary}33`,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/" aria-label="Geri" style={iconBtn()}>‹</Link>
          <div style={{ height: 12, width: 1, background: ND.border }} />
          <Eyebrow color={race.primary}>💬 Sohbet</Eyebrow>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: ND.ok,
              animation: 'pulse 2s ease-in-out infinite',
            }}
          />
          <Code style={{ fontSize: 9, color: ND.textDim }}>1,247 çevrimiçi</Code>
        </div>
      </header>

      {/* Tab Bar */}
      <div
        role="tablist"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 6,
          padding: '12px 16px 0',
          flexShrink: 0,
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setActiveDM(null);
                setNewMessageAlert(false);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '10px 6px',
                fontFamily: ND.display,
                fontSize: 10,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                fontWeight: 700,
                background: isActive
                  ? `linear-gradient(180deg, ${race.primary}28, ${race.primary}10)`
                  : 'transparent',
                border: `1px solid ${isActive ? race.primary : ND.border}`,
                color: isActive ? race.primary : ND.textDim,
                borderRadius: 3,
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              <span aria-hidden>{tab.icon}</span>
              {tab.label}
              {tab.badge ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 999,
                    minWidth: 14,
                    height: 14,
                    padding: '0 3px',
                    fontWeight: 800,
                    fontSize: 8,
                    background: ND.danger,
                    color: '#0A0E1A',
                  }}
                >
                  {tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '12px 16px 0', minHeight: 0 }}>
        <Panel race={race} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
          {/* DM List */}
          {activeTab === 'dm' && !activeDM && (
            <div style={{ flex: 1, overflow: 'auto' }}>
              <div style={{ padding: '12px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Eyebrow color={race.primary}>Özel Mesajlar</Eyebrow>
                <Code>{DM_CONVERSATIONS.length}</Code>
              </div>
              {DM_CONVERSATIONS.map((conv) => (
                <DMListItem
                  key={conv.id}
                  conv={conv}
                  onClick={() => setActiveDM(conv)}
                />
              ))}
            </div>
          )}

          {/* DM Conversation View */}
          {activeTab === 'dm' && activeDM && (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderBottom: `1px solid ${ND.border}`,
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveDM(null)}
                  style={{
                    ...iconBtn(),
                    width: 28,
                    height: 28,
                    cursor: 'pointer',
                  }}
                  aria-label="Geri"
                >
                  ‹
                </button>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 28,
                    height: 28,
                    background: `${RACES[activeDM.race].primary}18`,
                    border: `2px solid ${RACES[activeDM.race].primary}55`,
                    color: RACES[activeDM.race].primary,
                    fontFamily: ND.display,
                    fontWeight: 800,
                    fontSize: 10,
                    borderRadius: 3,
                  }}
                >
                  {activeDM.author.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: ND.display, fontSize: 11, fontWeight: 700, color: ND.text }}>
                      {activeDM.author}
                    </span>
                    <RaceBadge raceKey={activeDM.race} size="xs" />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: activeDM.online ? ND.ok : ND.textMute,
                      }}
                    />
                    <Code style={{ fontSize: 9 }}>
                      {activeDM.online ? 'Çevrimiçi' : 'Çevrimdışı'} · Lv.{activeDM.level}
                    </Code>
                  </div>
                </div>
              </div>

              <div
                ref={messageContainerRef}
                style={{
                  flex: 1,
                  overflow: 'auto',
                  padding: '8px 0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <div
                  style={{
                    margin: '8px 12px',
                    padding: 8,
                    textAlign: 'center',
                    fontFamily: ND.mono,
                    fontSize: 10,
                    color: ND.textMute,
                    background: 'rgba(120,160,220,0.05)',
                    border: `1px dashed ${ND.border}`,
                    borderRadius: 3,
                  }}
                >
                  Konuşma başladı
                </div>
                <MessageBubble
                  myRace={race}
                  message={{
                    id: 'dm-msg-1',
                    type: 'player',
                    author: activeDM.author,
                    race: activeDM.race,
                    level: activeDM.level,
                    content: activeDM.lastMessage,
                    timestamp: activeDM.timestamp,
                  }}
                />
                <div ref={messagesEndRef} />
              </div>
            </>
          )}

          {/* Global / Guild Message List */}
          {activeTab !== 'dm' && (
            <div
              ref={messageContainerRef}
              style={{
                flex: 1,
                overflow: 'auto',
                padding: '8px 0',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              {messages.length === 0 ? (
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: 24,
                    color: ND.textMute,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 32, opacity: 0.4 }} aria-hidden>💬</div>
                  <div style={{ fontFamily: ND.body, fontSize: 12 }}>
                    Henüz mesaj yok. İlk konuşmayı sen başlat.
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} myRace={race} />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* New message alert */}
          {newMessageAlert && activeTab === 'global' && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                setNewMessageAlert(false);
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}
              style={{
                position: 'absolute',
                left: 12,
                right: 12,
                bottom: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                padding: '8px 12px',
                background: `${race.primary}18`,
                border: `1px solid ${race.primary}40`,
                backdropFilter: 'blur(12px)',
                borderRadius: 4,
                cursor: 'pointer',
                zIndex: 5,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: race.primary,
                    flexShrink: 0,
                    animation: 'pulse 1.4s ease-in-out infinite',
                  }}
                />
                <span style={{ fontFamily: ND.display, fontSize: 10, fontWeight: 700, color: race.primary, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Yeni mesaj
                </span>
              </div>
              <Code style={{ color: ND.textDim }}>Alta git ↓</Code>
            </div>
          )}
        </Panel>
      </main>

      {/* Input Bar */}
      {(activeTab !== 'dm' || activeDM) && (
        <div
          style={{
            position: 'relative',
            margin: '8px 16px 0',
            background: ND.surface,
            border: `1px solid ${race.primary}33`,
            borderRadius: 4,
            backdropFilter: 'blur(20px)',
            flexShrink: 0,
          }}
        >
          {/* Quick Reply Popover */}
          {showQuickReplies && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                right: 0,
                marginBottom: 4,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                padding: 12,
                background: ND.surfaceHi,
                border: `1px solid ${ND.border}`,
                borderRadius: 4,
                backdropFilter: 'blur(12px)',
              }}
            >
              <div style={{ width: '100%' }}>
                <Eyebrow color={race.primary}>Hızlı yanıtlar</Eyebrow>
              </div>
              {QUICK_REPLIES.map((reply) => (
                <button
                  key={reply}
                  type="button"
                  onClick={() => { setInput(reply); setShowQuickReplies(false); }}
                  style={{
                    padding: '4px 10px',
                    fontFamily: ND.body,
                    fontSize: 11,
                    background: `${race.primary}12`,
                    border: `1px solid ${race.primary}30`,
                    color: race.primary,
                    borderRadius: 999,
                    cursor: 'pointer',
                  }}
                >
                  {reply}
                </button>
              ))}
            </div>
          )}

          {/* Emoji Picker */}
          {showEmoji && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                right: 0,
                marginBottom: 4,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                padding: 12,
                background: ND.surfaceHi,
                border: `1px solid ${ND.border}`,
                borderRadius: 4,
                backdropFilter: 'blur(12px)',
              }}
            >
              <div style={{ width: '100%' }}>
                <Eyebrow color={race.primary}>Emoji</Eyebrow>
              </div>
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => { setInput((v) => v + emoji); }}
                  style={{
                    fontSize: 18,
                    width: 36,
                    height: 36,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(120,160,220,0.08)',
                    border: `1px solid ${ND.border}`,
                    borderRadius: 3,
                    cursor: 'pointer',
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Input Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8 }}>
            <button
              type="button"
              onClick={() => { setShowEmoji((v) => !v); setShowQuickReplies(false); }}
              aria-label="Emoji"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                fontSize: 16,
                background: showEmoji ? `${race.primary}20` : 'rgba(120,160,220,0.06)',
                border: `1px solid ${showEmoji ? race.primary + '60' : ND.border}`,
                borderRadius: 3,
                cursor: 'pointer',
              }}
            >
              😊
            </button>

            <button
              type="button"
              onClick={() => { setShowQuickReplies((v) => !v); setShowEmoji(false); }}
              aria-label="Hızlı yanıtlar"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                fontSize: 14,
                background: showQuickReplies ? `${race.primary}20` : 'rgba(120,160,220,0.06)',
                border: `1px solid ${showQuickReplies ? race.primary + '60' : ND.border}`,
                borderRadius: 3,
                cursor: 'pointer',
              }}
            >
              ⚡
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
              placeholder="Mesaj yaz..."
              style={{
                flex: 1,
                fontFamily: ND.body,
                fontSize: 13,
                color: ND.text,
                background: 'rgba(120,160,220,0.06)',
                border: `1px solid ${race.primary}30`,
                outline: 'none',
                padding: '8px 12px',
                borderRadius: 3,
                transition: 'border-color 0.2s',
                minWidth: 0,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = `${race.primary}80`;
                setShowEmoji(false);
                setShowQuickReplies(false);
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = `${race.primary}30`;
              }}
            />

            <NDButton
              race={race}
              size="sm"
              onClick={handleSend}
              disabled={!input.trim()}
              style={{ minWidth: 56 }}
            >
              Gönder
            </NDButton>
          </div>
        </div>
      )}

      <div style={{ paddingTop: 8, flexShrink: 0 }}>
        <BottomNav />
      </div>
    </Screen>
  );
}

/* ── pieces ───────────────────────────────────────────────────────────── */

function iconBtn(): CSSProperties {
  return {
    width: 32,
    height: 32,
    borderRadius: 4,
    border: `1px solid ${ND.border}`,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: ND.text,
    fontFamily: ND.display,
    textDecoration: 'none',
    background: 'transparent',
  };
}
