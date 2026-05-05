'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRaceTheme } from '@/hooks/useRaceTheme';
import { BottomNav } from '@/components/ui/BottomNav';

/* ── Types ─────────────────────────────────────────────────────────────── */

type ChatTab = 'global' | 'guild' | 'dm';
type Race = 'insan' | 'zerg' | 'otomat' | 'canavar' | 'seytan';

interface ChatMessage {
  id: string;
  type: 'player' | 'system' | 'battle' | 'guild';
  author?: string;
  race?: Race;
  level?: number;
  content: string;
  timestamp: string;
  isOwn?: boolean;
}

interface DMConversation {
  id: string;
  author: string;
  race: Race;
  level: number;
  lastMessage: string;
  timestamp: string;
  unread: number;
  online: boolean;
}

/* ── Constants ─────────────────────────────────────────────────────────── */

const RACE_COLORS: Record<Race, string> = {
  insan:   '#4a9eff',
  zerg:    '#44ff44',
  otomat:  '#00cfff',
  canavar: '#ff6600',
  seytan:  '#cc00ff',
};

const RACE_LABELS: Record<Race, string> = {
  insan:   'İNSAN',
  zerg:    'ZERG',
  otomat:  'OTOMAT',
  canavar: 'CANAVAR',
  seytan:  'ŞEYTAN',
};

const RACE_ICONS: Record<Race, string> = {
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

function RaceBadge({ race, size = 'sm' }: { race: Race; size?: 'xs' | 'sm' }) {
  const color = RACE_COLORS[race];
  const label = RACE_LABELS[race];
  const icon = RACE_ICONS[race];
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded font-display font-black uppercase tracking-widest"
      style={{
        fontSize: size === 'xs' ? '7px' : '8px',
        padding: size === 'xs' ? '1px 4px' : '2px 5px',
        background: `${color}18`,
        color,
        border: `1px solid ${color}35`,
      }}
    >
      {icon} {label}
    </span>
  );
}

function MessageAvatar({ author, race, isOwn }: { author: string; race: Race; isOwn?: boolean }) {
  const color = RACE_COLORS[race];
  const initials = author.slice(0, 2).toUpperCase();
  return (
    <div
      className="flex-shrink-0 flex items-center justify-center rounded font-display font-black text-[10px] select-none"
      style={{
        width: 32,
        height: 32,
        background: `${color}18`,
        border: `2px solid ${color}55`,
        color,
        boxShadow: isOwn ? `0 0 8px ${color}40` : undefined,
      }}
    >
      {initials}
    </div>
  );
}

/* Manga-style speech bubble */
function MessageBubble({
  message,
  raceColor,
}: {
  message: ChatMessage;
  raceColor: string;
}) {
  const isOwn = message.isOwn;
  const bubbleColor = isOwn ? raceColor : (message.race ? RACE_COLORS[message.race] : '#a0a8c0');

  if (message.type === 'system') {
    return (
      <div
        className="flex items-center gap-2 mx-2 my-1 px-3 py-1.5 rounded font-body text-[11px]"
        style={{
          background: 'rgba(0,207,255,0.06)',
          border: '1px solid rgba(0,207,255,0.15)',
          color: '#00cfff',
          borderLeft: '3px solid #00cfff',
        }}
      >
        <span style={{ opacity: 0.7 }}>{message.content}</span>
        <span className="ml-auto text-[9px] font-display" style={{ color: '#555d7a', flexShrink: 0 }}>
          {message.timestamp}
        </span>
      </div>
    );
  }

  if (message.type === 'battle') {
    return (
      <div
        className="flex items-center gap-2 mx-2 my-1 px-3 py-1.5 rounded font-body text-[11px]"
        style={{
          background: 'rgba(255,51,85,0.06)',
          border: '1px solid rgba(255,51,85,0.18)',
          color: '#ff6680',
          borderLeft: '3px solid #ff3355',
        }}
      >
        <span style={{ opacity: 0.85 }}>{message.content}</span>
        <span className="ml-auto text-[9px] font-display" style={{ color: '#555d7a', flexShrink: 0 }}>
          {message.timestamp}
        </span>
      </div>
    );
  }

  if (message.type === 'guild') {
    return (
      <div
        className="flex items-center gap-2 mx-2 my-1 px-3 py-1.5 rounded font-body text-[11px]"
        style={{
          background: 'rgba(255,200,50,0.06)',
          border: '1px solid rgba(255,200,50,0.15)',
          color: '#ffc832',
          borderLeft: '3px solid #ffc832',
        }}
      >
        <span style={{ opacity: 0.85 }}>{message.content}</span>
        <span className="ml-auto text-[9px] font-display" style={{ color: '#555d7a', flexShrink: 0 }}>
          {message.timestamp}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-end gap-2 px-3 py-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isOwn && <MessageAvatar author={message.author!} race={message.race!} />}

      <div className={`flex flex-col gap-0.5 max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Author line */}
        {!isOwn && (
          <div className="flex items-center gap-1.5 px-1">
            <span
              className="font-display text-[10px] font-bold tracking-wide"
              style={{ color: bubbleColor }}
            >
              {message.author}
            </span>
            {message.race && <RaceBadge race={message.race} size="xs" />}
            {message.level && (
              <span className="font-display text-[8px]" style={{ color: '#555d7a' }}>
                Lv.{message.level}
              </span>
            )}
          </div>
        )}

        {/* Speech balloon — manga style */}
        <div
          className="relative px-3 py-2 font-body text-[12px] leading-relaxed"
          style={{
            background: isOwn
              ? `linear-gradient(135deg, ${bubbleColor}22 0%, ${bubbleColor}10 100%)`
              : 'rgba(20, 24, 44, 0.85)',
            border: `1.5px solid ${bubbleColor}${isOwn ? '60' : '30'}`,
            borderRadius: isOwn
              ? '12px 12px 2px 12px'
              : '12px 12px 12px 2px',
            color: 'var(--color-text-primary)',
            boxShadow: isOwn
              ? `0 0 12px ${bubbleColor}20, inset 0 0 0 1px ${bubbleColor}10`
              : '0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          {/* Manga corner accent */}
          <div
            className="absolute top-0 pointer-events-none"
            style={{
              [isOwn ? 'right' : 'left']: 0,
              width: 6,
              height: 6,
              background: bubbleColor,
              opacity: 0.5,
              borderRadius: isOwn ? '0 0 0 6px' : '0 0 6px 0',
            }}
          />
          {message.content}
        </div>

        <span
          className="font-display text-[8px] px-1"
          style={{ color: '#555d7a' }}
        >
          {message.timestamp}
        </span>
      </div>

      {isOwn && <MessageAvatar author="Sen" race="insan" isOwn />}
    </div>
  );
}

function DMListItem({ conv, onClick }: { conv: DMConversation; onClick: () => void }) {
  const color = RACE_COLORS[conv.race];
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200"
      style={{
        background: 'transparent',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = 'transparent';
      }}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div
          className="flex items-center justify-center rounded font-display font-black text-[10px]"
          style={{
            width: 36,
            height: 36,
            background: `${color}18`,
            border: `2px solid ${color}55`,
            color,
          }}
        >
          {conv.author.slice(0, 2).toUpperCase()}
        </div>
        {/* Online indicator */}
        <div
          className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
          style={{
            background: conv.online ? '#44ff88' : '#555d7a',
            borderColor: '#080a10',
          }}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="font-display text-[11px] font-bold text-text-primary truncate">
            {conv.author}
          </span>
          <RaceBadge race={conv.race} size="xs" />
        </div>
        <p className="font-body text-[11px] text-text-muted truncate">{conv.lastMessage}</p>
      </div>

      {/* Meta */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="font-display text-[9px]" style={{ color: '#555d7a' }}>
          {conv.timestamp}
        </span>
        {conv.unread > 0 && (
          <span
            className="flex items-center justify-center rounded-full font-display font-black text-[9px] min-w-[16px] h-4 px-1"
            style={{ background: '#ff3355', color: '#fff' }}
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
  const { raceColor, raceGlow } = useRaceTheme();
  const [activeTab, setActiveTab] = useState<ChatTab>('global');
  const [input, setInput] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [newMessageAlert, setNewMessageAlert] = useState(false);
  const [activeDM, setActiveDM] = useState<DMConversation | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);

  const messages = activeTab === 'global' ? GLOBAL_MESSAGES : GUILD_MESSAGES;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeTab, activeDM]);

  /* Simulate incoming message */
  useEffect(() => {
    if (activeTab !== 'global') return;
    const timer = setTimeout(() => {
      setNewMessageAlert(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, [activeTab]);

  function handleSend() {
    if (!input.trim()) return;
    setInput('');
    setShowEmoji(false);
    setShowQuickReplies(false);
  }

  const tabs: { id: ChatTab; label: string; icon: string; badge?: number }[] = [
    { id: 'global', label: 'Global', icon: '🌌' },
    { id: 'guild',  label: 'Lonca',  icon: '🤝', badge: 3 },
    { id: 'dm',     label: 'Özel',   icon: '📨', badge: DM_CONVERSATIONS.reduce((n, c) => n + c.unread, 0) },
  ];

  return (
    <div
      className="h-dvh flex flex-col relative overflow-hidden"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Nebula bg */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'var(--gradient-nebula)', zIndex: 0 }}
        aria-hidden
      />
      <div className="fixed inset-0 pointer-events-none opacity-10" aria-hidden />

      {/* Speed lines */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute h-px"
            style={{
              top: `${12 + i * 18}%`,
              left: 0,
              right: 0,
              background: `linear-gradient(90deg, transparent 0%, ${raceColor}07 50%, transparent 100%)`,
            }}
          />
        ))}
      </div>

      {/* ── Header ────────────────────────────────────────────── */}
      <header
        className="relative z-40 sticky top-0 flex items-center justify-between px-4 py-2"
        style={{
          background: 'rgba(8,10,16,0.95)',
          borderBottom: `1px solid ${raceColor}20`,
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="font-display text-text-muted text-[10px] hover:text-text-primary transition-colors"
          >
            ← Ana Üs
          </Link>
          <div className="h-3 w-px" style={{ background: 'rgba(255,255,255,0.10)' }} />
          <span
            className="font-display text-[11px] font-black uppercase tracking-widest"
            style={{ color: raceColor }}
          >
            💬 SOHBET
          </span>
        </div>

        {/* Online count */}
        <div className="flex items-center gap-1.5">
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: '#44ff88' }}
          />
          <span className="font-display text-[9px]" style={{ color: '#555d7a' }}>
            1,247 çevrimiçi
          </span>
        </div>
      </header>

      {/* ── Tab Bar ───────────────────────────────────────────── */}
      <div
        className="relative z-30 flex"
        style={{
          background: 'rgba(13,17,23,0.9)',
          borderBottom: `1px solid rgba(255,255,255,0.05)`,
          backdropFilter: 'blur(12px)',
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setActiveDM(null); setNewMessageAlert(false); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 relative transition-all duration-200 font-display text-[10px] font-bold uppercase tracking-widest"
              style={{
                color: isActive ? raceColor : '#555d7a',
                borderBottom: isActive ? `2px solid ${raceColor}` : '2px solid transparent',
                background: isActive ? `${raceColor}08` : 'transparent',
              }}
            >
              <span aria-hidden>{tab.icon}</span>
              {tab.label}
              {tab.badge ? (
                <span
                  className="flex items-center justify-center rounded-full min-w-[14px] h-3.5 px-0.5 font-black text-[8px]"
                  style={{ background: '#ff3355', color: '#fff' }}
                >
                  {tab.badge}
                </span>
              ) : null}
              {isActive && (
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-px"
                  style={{
                    background: raceColor,
                    boxShadow: `0 0 8px ${raceColor}`,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Content ───────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col overflow-hidden">

        {/* DM List */}
        {activeTab === 'dm' && !activeDM && (
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-2">
              <span className="font-display text-[9px] uppercase tracking-widest" style={{ color: '#555d7a' }}>
                Özel Mesajlar
              </span>
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
            {/* DM Header */}
            <div
              className="flex items-center gap-3 px-4 py-2"
              style={{
                background: 'rgba(13,17,23,0.8)',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <button
                onClick={() => setActiveDM(null)}
                className="font-display text-[10px] text-text-muted hover:text-text-primary transition-colors"
              >
                ←
              </button>
              <div
                className="flex items-center justify-center rounded font-display font-black text-[10px]"
                style={{
                  width: 28,
                  height: 28,
                  background: `${RACE_COLORS[activeDM.race]}18`,
                  border: `2px solid ${RACE_COLORS[activeDM.race]}55`,
                  color: RACE_COLORS[activeDM.race],
                }}
              >
                {activeDM.author.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-[11px] font-bold text-text-primary">
                    {activeDM.author}
                  </span>
                  <RaceBadge race={activeDM.race} size="xs" />
                </div>
                <div className="flex items-center gap-1">
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: activeDM.online ? '#44ff88' : '#555d7a' }}
                  />
                  <span className="font-display text-[8px]" style={{ color: '#555d7a' }}>
                    {activeDM.online ? 'Çevrimiçi' : 'Çevrimdışı'} · Lv.{activeDM.level}
                  </span>
                </div>
              </div>
            </div>

            {/* DM Messages */}
            <div ref={messageContainerRef} className="flex-1 overflow-y-auto py-2 flex flex-col gap-1">
              <div
                className="mx-3 my-2 p-2 text-center font-body text-[10px] rounded"
                style={{ background: 'rgba(255,255,255,0.03)', color: '#555d7a' }}
              >
                Konuşma başladı
              </div>
              <MessageBubble
                raceColor={raceColor}
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
          <div ref={messageContainerRef} className="flex-1 overflow-y-auto py-2 flex flex-col gap-0.5">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} raceColor={raceColor} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* New message notification bar */}
        {newMessageAlert && activeTab === 'global' && (
          <div
            className="absolute left-3 right-3 flex items-center justify-between gap-2 px-3 py-2 rounded-lg cursor-pointer"
            style={{
              bottom: 72,
              background: `${raceColor}18`,
              border: `1px solid ${raceColor}40`,
              backdropFilter: 'blur(12px)',
              zIndex: 20,
            }}
            onClick={() => {
              setNewMessageAlert(false);
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full animate-pulse flex-shrink-0"
                style={{ background: raceColor }}
              />
              <span className="font-display text-[10px] font-bold" style={{ color: raceColor }}>
                Yeni mesaj
              </span>
            </div>
            <span className="font-display text-[9px]" style={{ color: '#555d7a' }}>
              Alta git ↓
            </span>
          </div>
        )}
      </main>

      {/* ── Input Bar ─────────────────────────────────────────── */}
      {(activeTab !== 'dm' || activeDM) && (
        <div
          className="relative z-30"
          style={{
            background: 'rgba(8,10,16,0.97)',
            borderTop: `1px solid ${raceColor}18`,
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Quick Reply Popover */}
          {showQuickReplies && (
            <div
              className="absolute bottom-full left-0 right-0 flex flex-wrap gap-1.5 p-3"
              style={{
                background: 'rgba(13,17,23,0.98)',
                borderTop: `1px solid rgba(255,255,255,0.06)`,
              }}
            >
              <span className="w-full font-display text-[9px] uppercase tracking-widest" style={{ color: '#555d7a' }}>
                Hızlı yanıtlar
              </span>
              {QUICK_REPLIES.map((reply) => (
                <button
                  key={reply}
                  onClick={() => { setInput(reply); setShowQuickReplies(false); }}
                  className="px-2.5 py-1 rounded-full font-body text-[11px] transition-all duration-150"
                  style={{
                    background: `${raceColor}12`,
                    border: `1px solid ${raceColor}30`,
                    color: raceColor,
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
              className="absolute bottom-full left-0 right-0 flex flex-wrap gap-2 p-3"
              style={{
                background: 'rgba(13,17,23,0.98)',
                borderTop: `1px solid rgba(255,255,255,0.06)`,
              }}
            >
              <span className="w-full font-display text-[9px] uppercase tracking-widest" style={{ color: '#555d7a' }}>
                Emoji
              </span>
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => { setInput((v) => v + emoji); }}
                  className="text-lg w-9 h-9 flex items-center justify-center rounded transition-all duration-150 hover:scale-110"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Input Row */}
          <div className="flex items-center gap-2 px-3 py-2.5">
            {/* Emoji toggle */}
            <button
              onClick={() => { setShowEmoji((v) => !v); setShowQuickReplies(false); }}
              className="flex items-center justify-center w-8 h-8 rounded transition-all duration-150"
              style={{
                background: showEmoji ? `${raceColor}20` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${showEmoji ? raceColor + '50' : 'rgba(255,255,255,0.08)'}`,
                fontSize: 16,
              }}
              title="Emoji"
            >
              😊
            </button>

            {/* Quick replies toggle */}
            <button
              onClick={() => { setShowQuickReplies((v) => !v); setShowEmoji(false); }}
              className="flex items-center justify-center w-8 h-8 rounded transition-all duration-150"
              style={{
                background: showQuickReplies ? `${raceColor}20` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${showQuickReplies ? raceColor + '50' : 'rgba(255,255,255,0.08)'}`,
                fontSize: 13,
              }}
              title="Hızlı yanıtlar"
            >
              ⚡
            </button>

            {/* Text input */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
              placeholder="Mesaj yaz..."
              className="flex-1 bg-transparent font-body text-[13px] text-text-primary placeholder:text-text-muted outline-none px-3 py-1.5 rounded"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${raceColor}20`,
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = `${raceColor}60`;
                setShowEmoji(false);
                setShowQuickReplies(false);
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = `${raceColor}20`;
              }}
            />

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="flex items-center justify-center w-9 h-9 rounded font-display font-black text-[12px] transition-all duration-200 disabled:opacity-40"
              style={{
                background: input.trim() ? raceColor : 'rgba(255,255,255,0.06)',
                color: input.trim() ? '#080a10' : '#555d7a',
                boxShadow: input.trim() ? `0 0 12px ${raceGlow}` : undefined,
              }}
              title="Gönder"
            >
              ▶
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
