'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRaceTheme } from '@/hooks/useRaceTheme';
import { MangaPanel } from '@/components/ui/MangaPanel';
import { GlowButton } from '@/components/ui/GlowButton';

// ── Types ────────────────────────────────────────────────────────────────────

type MemberRole = 'Lider' | 'Subay' | 'Veteran' | 'Üye' | 'Acemi';
type ResourceType = 'mineral' | 'gas' | 'energy';
type WarStatus = 'active' | 'victory' | 'defeat' | 'draw';

interface AllianceMember {
  id: string;
  name: string;
  race: string;
  raceIcon: string;
  raceColor: string;
  role: MemberRole;
  power: number;
  contribution: number;
  isOnline: boolean;
  portrait: string;
}

interface ChatMessage {
  id: string;
  authorId: string;
  authorName: string;
  authorRace: string;
  authorRaceIcon: string;
  authorColor: string;
  content: string;
  timestamp: string;
  reactions: { emoji: string; count: number; reacted: boolean }[];
  isSelf: boolean;
}

interface DonationLog {
  id: string;
  memberName: string;
  resource: ResourceType;
  amount: number;
  points: number;
  time: string;
}

interface WarRecord {
  id: string;
  opponent: string;
  opponentTag: string;
  status: WarStatus;
  ourScore: number;
  theirScore: number;
  territory: number;
  date: string;
  isActive: boolean;
}

// ── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_ALLIANCE = {
  name: 'Nebula Vanguard',
  tag: 'NV',
  level: 7,
  xp: 6400,
  xpNext: 8000,
  memberCount: 18,
  maxMembers: 25,
  totalPower: 2_847_320,
  globalRank: 42,
  territory: 14,
  warWins: 31,
  warLosses: 9,
  isOpen: true,
  description: 'Evrenin dört bir yanından gelen elit komutanlar. Zafer ya da yıkım — başka seçenek yok.',
};

const MOCK_MEMBERS: AllianceMember[] = [
  { id: 'm1', name: 'Commander Voss', race: 'İnsan', raceIcon: '⚔️', raceColor: '#4a9eff', role: 'Lider', power: 487_200, contribution: 18_400, isOnline: true, portrait: '/assets/characters/insan/voss.png' },
  { id: 'm2', name: 'Demiurge Prime', race: 'Otomat', raceIcon: '⚙️', raceColor: '#00cfff', role: 'Subay', power: 412_800, contribution: 14_200, isOnline: true, portrait: '/assets/characters/otomat/demiurge_prime.png' },
  { id: 'm3', name: 'Morgath', race: 'Zerg', raceIcon: '🦟', raceColor: '#44ff44', role: 'Subay', power: 398_500, contribution: 12_800, isOnline: false, portrait: '/assets/characters/zerg/morgath.png' },
  { id: 'm4', name: 'Khorvash', race: 'Canavar', raceIcon: '🐉', raceColor: '#ff6600', role: 'Veteran', power: 367_000, contribution: 9_600, isOnline: true, portrait: '/assets/characters/canavar/khorvash.png' },
  { id: 'm5', name: 'Malphas', race: 'Şeytan', raceIcon: '👁️', raceColor: '#cc00ff', role: 'Veteran', power: 344_100, contribution: 8_200, isOnline: false, portrait: '/assets/characters/seytan/malphas.png' },
  { id: 'm6', name: 'Reyes', race: 'İnsan', raceIcon: '⚔️', raceColor: '#4a9eff', role: 'Üye', power: 298_700, contribution: 6_400, isOnline: true, portrait: '/assets/characters/insan/reyes.png' },
  { id: 'm7', name: 'Threnix', race: 'Zerg', raceIcon: '🦟', raceColor: '#44ff44', role: 'Üye', power: 276_400, contribution: 5_800, isOnline: true, portrait: '/assets/characters/zerg/threnix.png' },
  { id: 'm8', name: 'Lilithra', race: 'Şeytan', raceIcon: '👁️', raceColor: '#cc00ff', role: 'Acemi', power: 189_320, contribution: 1_200, isOnline: false, portrait: '/assets/characters/seytan/lilithra.png' },
];

const MOCK_MESSAGES: ChatMessage[] = [
  { id: 'c1', authorId: 'm3', authorName: 'Morgath', authorRace: 'Zerg', authorRaceIcon: '🦟', authorColor: '#44ff44', content: 'Sector 7\'yi ele geçirdik. Güç artık bizde.', timestamp: '14:32', reactions: [{ emoji: '🔥', count: 4, reacted: false }, { emoji: '⚔️', count: 2, reacted: true }], isSelf: false },
  { id: 'c2', authorId: 'm4', authorName: 'Khorvash', authorRace: 'Canavar', authorRaceIcon: '🐉', authorColor: '#ff6600', content: 'Bağış panelini doldurun. Lonca seviyemiz 8\'e çıkacak.', timestamp: '14:38', reactions: [{ emoji: '💎', count: 3, reacted: false }], isSelf: false },
  { id: 'c3', authorId: 'self', authorName: 'Sen', authorRace: 'İnsan', authorRaceIcon: '⚔️', authorColor: '#4a9eff', content: 'Mineral ve gas gönderdim. 2000 puan kazandım.', timestamp: '14:45', reactions: [], isSelf: true },
  { id: 'c4', authorId: 'm2', authorName: 'Demiurge Prime', authorRace: 'Otomat', authorRaceIcon: '⚙️', authorColor: '#00cfff', content: 'Savaş bildirimi gönderildi — Iron Covenant\'a karşı yarın 20:00.', timestamp: '15:01', reactions: [{ emoji: '⚔️', count: 7, reacted: true }, { emoji: '🏆', count: 5, reacted: false }], isSelf: false },
  { id: 'c5', authorId: 'm1', authorName: 'Commander Voss', authorRace: 'İnsan', authorRaceIcon: '⚔️', authorColor: '#4a9eff', content: 'Tüm komutanlar savaş hazırlığı yapın. Zafer zorunlu.', timestamp: '15:15', reactions: [{ emoji: '🔥', count: 11, reacted: false }, { emoji: '⚔️', count: 9, reacted: true }], isSelf: false },
];

const MOCK_DONATIONS: DonationLog[] = [
  { id: 'd1', memberName: 'Commander Voss', resource: 'mineral', amount: 5000, points: 500, time: '2s önce' },
  { id: 'd2', memberName: 'Demiurge Prime', resource: 'gas', amount: 3000, points: 450, time: '18d önce' },
  { id: 'd3', memberName: 'Khorvash', resource: 'energy', amount: 2000, points: 600, time: '45d önce' },
  { id: 'd4', memberName: 'Threnix', resource: 'mineral', amount: 8000, points: 800, time: '2s önce' },
  { id: 'd5', memberName: 'Reyes', resource: 'gas', amount: 1500, points: 225, time: '3s önce' },
];

const MOCK_WARS: WarRecord[] = [
  { id: 'w1', opponent: 'Iron Covenant', opponentTag: 'IC', status: 'active', ourScore: 0, theirScore: 0, territory: 0, date: 'Yarın 20:00', isActive: true },
  { id: 'w2', opponent: 'Void Syndicate', opponentTag: 'VS', status: 'victory', ourScore: 187, theirScore: 143, territory: 4, date: '3 gün önce', isActive: false },
  { id: 'w3', opponent: 'Shadow Legion', opponentTag: 'SL', status: 'defeat', ourScore: 121, theirScore: 198, territory: -2, date: '1 hafta önce', isActive: false },
  { id: 'w4', opponent: 'Crimson Dawn', opponentTag: 'CD', status: 'victory', ourScore: 203, theirScore: 97, territory: 6, date: '2 hafta önce', isActive: false },
];

// ── Sub-components ───────────────────────────────────────────────────────────

function AllianceEmblem({ tag, raceColor, raceGlow }: { tag: string; raceColor: string; raceGlow: string }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 72, height: 72 }}>
      {/* Outer hex glow ring */}
      <div
        className="absolute inset-0 rounded-full opacity-30 animate-pulse"
        style={{ background: `radial-gradient(circle, ${raceGlow} 0%, transparent 70%)` }}
      />
      {/* Double-bezel shell */}
      <div
        className="relative flex items-center justify-center"
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: `rgba(8,10,16,0.95)`,
          border: `2px solid ${raceColor}`,
          boxShadow: `0 0 16px ${raceGlow}, 0 0 40px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.06)`,
        }}
      >
        {/* Inner emblem */}
        <div
          className="flex items-center justify-center"
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.08) 0%, ${raceColor}22 100%)`,
            border: `1px solid rgba(255,255,255,0.1)`,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 14,
              fontWeight: 900,
              color: raceColor,
              textShadow: `0 0 12px ${raceGlow}`,
              letterSpacing: '0.12em',
            }}
          >
            {tag}
          </span>
        </div>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: MemberRole }) {
  const styles: Record<MemberRole, { bg: string; color: string; border: string }> = {
    'Lider':  { bg: 'rgba(255,200,50,0.12)', color: '#ffc832', border: 'rgba(255,200,50,0.35)' },
    'Subay':  { bg: 'rgba(204,0,255,0.10)', color: '#cc00ff', border: 'rgba(204,0,255,0.30)' },
    'Veteran':{ bg: 'rgba(74,158,255,0.10)', color: '#4a9eff', border: 'rgba(74,158,255,0.30)' },
    'Üye':    { bg: 'rgba(68,217,200,0.10)', color: '#44d9c8', border: 'rgba(68,217,200,0.25)' },
    'Acemi':  { bg: 'rgba(255,255,255,0.05)', color: '#888aaa', border: 'rgba(255,255,255,0.10)' },
  };
  const s = styles[role];
  return (
    <span
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        padding: '2px 8px',
        borderRadius: 20,
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
      }}
    >
      {role}
    </span>
  );
}

function ResourceIcon({ type }: { type: ResourceType }) {
  const icons: Record<ResourceType, { icon: string; color: string }> = {
    mineral: { icon: '◆', color: '#4a9eff' },
    gas:     { icon: '◉', color: '#44ff88' },
    energy:  { icon: '⚡', color: '#ffc832' },
  };
  return <span style={{ color: icons[type].color }}>{icons[type].icon}</span>;
}

// ── Tab: Members ─────────────────────────────────────────────────────────────

function MembersTab({ raceColor, raceGlow }: { raceColor: string; raceGlow: string }) {
  const [search, setSearch] = useState('');
  const filtered = MOCK_MEMBERS.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.race.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Search + Action Row */}
      <div className="flex gap-3 items-center">
        <div
          className="flex-1 flex items-center gap-2 px-4"
          style={{
            height: 40,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
          }}
        >
          <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>⌕</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Üye ara..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
            }}
          />
        </div>
        <GlowButton size="sm" icon={<span>+</span>}>Davet Et</GlowButton>
      </div>

      {/* Member count header */}
      <div className="flex items-center justify-between px-1">
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: 'var(--color-text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          {filtered.length} Üye
        </span>
        <div className="flex gap-4">
          {(['Güç', 'Katkı'] as const).map(col => (
            <span key={col} style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: 'var(--color-text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              {col}
            </span>
          ))}
        </div>
      </div>

      {/* Member rows */}
      <div className="flex flex-col gap-2">
        {filtered.map((member, idx) => (
          <MangaPanel key={member.id} className="group hover:scale-[1.005] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
            <div className="flex items-center gap-3 px-4 py-3">
              {/* Rank */}
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 12,
                  fontWeight: 900,
                  color: idx < 3 ? raceColor : 'var(--color-text-muted)',
                  textShadow: idx < 3 ? `0 0 10px ${raceGlow}` : 'none',
                  width: 20,
                  textAlign: 'center',
                  flexShrink: 0,
                }}
              >
                {idx + 1}
              </span>

              {/* Avatar + Online dot */}
              <div className="relative flex-shrink-0">
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: `${member.raceColor}18`,
                    border: `1.5px solid ${member.raceColor}50`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                  }}
                >
                  {member.raceIcon}
                </div>
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    background: member.isOnline ? '#44ff88' : '#3a3d55',
                    border: '1.5px solid #080a10',
                    boxShadow: member.isOnline ? '0 0 6px rgba(68,255,136,0.6)' : 'none',
                  }}
                />
              </div>

              {/* Name + Role */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
                    {member.name}
                  </span>
                  <RoleBadge role={member.role} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <span style={{ fontSize: 9, color: member.raceColor, fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}>
                    {member.raceIcon} {member.race}
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-6 items-center ml-auto flex-shrink-0">
                <div className="text-right hidden sm:block">
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {(member.power / 1000).toFixed(0)}K
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--color-text-muted)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}>GÜÇ</div>
                </div>
                <div className="text-right hidden md:block">
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, color: raceColor }}>
                    {(member.contribution / 1000).toFixed(1)}K
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--color-text-muted)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}>KATKI</div>
                </div>
              </div>

              {/* Context Actions */}
              <div
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1 ml-2 flex-shrink-0"
              >
                {member.role !== 'Lider' && (
                  <button
                    className="btn-ghost"
                    style={{ padding: '4px 8px', fontSize: 10, fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </MangaPanel>
        ))}
      </div>

      {/* Pending Applications */}
      <div style={{ marginTop: 8, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: 'var(--color-text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>
          Bekleyen Başvurular (3)
        </div>
        {['Shadow Walker', 'Crucible', 'Vorhaal'].map((name, i) => (
          <div
            key={i}
            className="flex items-center justify-between px-4 py-2.5 mb-2"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 8,
            }}
          >
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-text-secondary)' }}>{name}</span>
            <div className="flex gap-2">
              <button
                style={{
                  padding: '4px 12px',
                  borderRadius: 20,
                  background: 'rgba(68,255,136,0.1)',
                  color: '#44ff88',
                  border: '1px solid rgba(68,255,136,0.25)',
                  fontFamily: 'var(--font-display)',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                Kabul
              </button>
              <button
                style={{
                  padding: '4px 12px',
                  borderRadius: 20,
                  background: 'rgba(255,51,85,0.1)',
                  color: '#ff3355',
                  border: '1px solid rgba(255,51,85,0.25)',
                  fontFamily: 'var(--font-display)',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                Reddet
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab: Chat ─────────────────────────────────────────────────────────────────

function ChatTab({ raceColor, raceGlow }: { raceColor: string; raceGlow: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const newMsg: ChatMessage = {
      id: `c${Date.now()}`,
      authorId: 'self',
      authorName: 'Sen',
      authorRace: 'İnsan',
      authorRaceIcon: '⚔️',
      authorColor: raceColor,
      content: input.trim(),
      timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      reactions: [],
      isSelf: true,
    };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
  };

  const addReaction = (msgId: string, emoji: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      const existing = m.reactions.find(r => r.emoji === emoji);
      if (existing) {
        return {
          ...m,
          reactions: m.reactions.map(r =>
            r.emoji === emoji ? { ...r, count: r.reacted ? r.count - 1 : r.count + 1, reacted: !r.reacted } : r
          ),
        };
      }
      return { ...m, reactions: [...m.reactions, { emoji, count: 1, reacted: true }] };
    }));
  };

  const QUICK_EMOJIS = ['🔥', '⚔️', '🏆', '💎', '👊', '❤️'];

  return (
    <div className="flex flex-col" style={{ height: 520 }}>
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.isSelf ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            {!msg.isSelf && (
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: `${msg.authorColor}18`,
                  border: `1.5px solid ${msg.authorColor}50`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  flexShrink: 0,
                  alignSelf: 'flex-start',
                }}
              >
                {msg.authorRaceIcon}
              </div>
            )}

            <div className={`flex flex-col gap-1 max-w-[72%] ${msg.isSelf ? 'items-end' : 'items-start'}`}>
              {/* Author + time */}
              {!msg.isSelf && (
                <div className="flex items-center gap-2">
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, color: msg.authorColor }}>
                    {msg.authorName}
                  </span>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--color-text-muted)' }}>
                    {msg.timestamp}
                  </span>
                </div>
              )}

              {/* Bubble */}
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: msg.isSelf ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
                  background: msg.isSelf
                    ? `linear-gradient(135deg, ${raceColor}22 0%, ${raceColor}14 100%)`
                    : 'rgba(255,255,255,0.04)',
                  border: msg.isSelf
                    ? `1px solid ${raceColor}40`
                    : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: msg.isSelf ? `0 0 12px ${raceGlow}20` : 'none',
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: 'var(--color-text-primary)',
                }}
              >
                {msg.content}
              </div>

              {/* Timestamp for self */}
              {msg.isSelf && (
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--color-text-muted)' }}>
                  {msg.timestamp}
                </span>
              )}

              {/* Reactions */}
              {msg.reactions.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {msg.reactions.map(r => (
                    <button
                      key={r.emoji}
                      onClick={() => addReaction(msg.id, r.emoji)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '2px 8px',
                        borderRadius: 12,
                        background: r.reacted ? `${raceColor}18` : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${r.reacted ? `${raceColor}35` : 'rgba(255,255,255,0.08)'}`,
                        cursor: 'pointer',
                        fontFamily: 'var(--font-body)',
                        fontSize: 11,
                        color: r.reacted ? raceColor : 'var(--color-text-secondary)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {r.emoji} <span>{r.count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick reactions */}
      <div className="flex gap-1.5 py-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10, marginTop: 8 }}>
        {QUICK_EMOJIS.map(emoji => (
          <button
            key={emoji}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              cursor: 'pointer',
              fontSize: 14,
              transition: 'transform 0.2s ease, background 0.2s ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.10)'; (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.15)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div
        className="flex items-center gap-2 px-3"
        style={{
          height: 48,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
        }}
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Mesaj yaz..."
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-body)',
            fontSize: 14,
          }}
        />
        <button
          onClick={handleSend}
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: input.trim() ? raceColor : 'rgba(255,255,255,0.06)',
            border: 'none',
            cursor: input.trim() ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: input.trim() ? '#080a10' : 'var(--color-text-muted)',
            fontSize: 14,
            transition: 'all 0.2s ease',
            boxShadow: input.trim() ? `0 0 12px ${raceGlow}` : 'none',
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}

// ── Tab: Donation ─────────────────────────────────────────────────────────────

function DonationTab({ raceColor, raceGlow }: { raceColor: string; raceGlow: string }) {
  const [amounts, setAmounts] = useState({ mineral: 1000, gas: 500, energy: 300 });
  const [donated, setDonated] = useState(false);

  const RESOURCE_CONFIG: Record<ResourceType, { label: string; icon: string; color: string; max: number; current: number; capacity: number }> = {
    mineral: { label: 'Mineral', icon: '◆', color: '#4a9eff', max: 10000, current: 6400, capacity: 10000 },
    gas:     { label: 'Gas',     icon: '◉', color: '#44ff88', max: 8000,  current: 3200, capacity: 8000  },
    energy:  { label: 'Enerji',  icon: '⚡', color: '#ffc832', max: 5000,  current: 1800, capacity: 5000  },
  };

  const totalPoints = Math.round(amounts.mineral * 0.1 + amounts.gas * 0.15 + amounts.energy * 0.2);

  const handleDonate = () => {
    setDonated(true);
    setTimeout(() => setDonated(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Alliance storage overview */}
      <MangaPanel halftone>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: 'var(--color-text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Lonca Deposu
            </span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: raceColor, letterSpacing: '0.1em' }}>
              Seviye {MOCK_ALLIANCE.level} Depo
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {(Object.keys(RESOURCE_CONFIG) as ResourceType[]).map(type => {
              const cfg = RESOURCE_CONFIG[type];
              const pct = (cfg.current / cfg.capacity) * 100;
              return (
                <div key={type}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span style={{ color: cfg.color, fontSize: 12 }}>{cfg.icon}</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', letterSpacing: '0.08em' }}>
                        {cfg.label}
                      </span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--color-text-muted)' }}>
                      {cfg.current.toLocaleString()} / {cfg.capacity.toLocaleString()}
                    </span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        borderRadius: 3,
                        background: `linear-gradient(90deg, ${cfg.color}88 0%, ${cfg.color} 100%)`,
                        boxShadow: `0 0 8px ${cfg.color}50`,
                        transition: 'width 0.6s cubic-bezier(0.32,0.72,0,1)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </MangaPanel>

      {/* Donation inputs */}
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: 'var(--color-text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>
          Bağış Miktarı
        </div>
        <div className="flex flex-col gap-3">
          {(Object.keys(amounts) as ResourceType[]).map(type => {
            const cfg = RESOURCE_CONFIG[type];
            return (
              <MangaPanel key={type}>
                <div className="flex items-center gap-4 px-4 py-3">
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: `${cfg.color}14`,
                      border: `1px solid ${cfg.color}30`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      flexShrink: 0,
                    }}
                  >
                    {cfg.icon}
                  </div>
                  <div className="flex-1">
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', letterSpacing: '0.08em', marginBottom: 4 }}>
                      {cfg.label}
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={cfg.max}
                      step={100}
                      value={amounts[type]}
                      onChange={e => setAmounts(prev => ({ ...prev, [type]: Number(e.target.value) }))}
                      style={{
                        width: '100%',
                        accentColor: cfg.color,
                        height: 3,
                        cursor: 'pointer',
                      }}
                    />
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 60 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: cfg.color }}>
                      {amounts[type].toLocaleString()}
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: 'var(--color-text-muted)', letterSpacing: '0.1em' }}>
                      +{Math.round(amounts[type] * (type === 'mineral' ? 0.1 : type === 'gas' ? 0.15 : 0.2))} puan
                    </div>
                  </div>
                </div>
              </MangaPanel>
            );
          })}
        </div>
      </div>

      {/* Points summary + donate button */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{
          background: `radial-gradient(ellipse at center, ${raceColor}08 0%, transparent 70%)`,
          border: `1px solid ${raceColor}25`,
          borderRadius: 12,
        }}
      >
        <div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-text-muted)' }}>Kazanılacak Lonca Puanı</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 900, color: raceColor, textShadow: `0 0 16px ${raceGlow}` }}>
            +{totalPoints.toLocaleString()} <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>puan</span>
          </div>
        </div>
        <GlowButton
          onClick={handleDonate}
          disabled={totalPoints === 0}
          size="lg"
          icon={<span>{donated ? '✓' : '▲'}</span>}
        >
          {donated ? 'Gönderildi' : 'Bağışla'}
        </GlowButton>
      </div>

      {/* Donation log */}
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: 'var(--color-text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>
          Son Bağışlar
        </div>
        <div className="flex flex-col gap-1.5">
          {MOCK_DONATIONS.map(log => (
            <div
              key={log.id}
              className="flex items-center justify-between px-3 py-2"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: 8,
              }}
            >
              <div className="flex items-center gap-2">
                <ResourceIcon type={log.resource} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  {log.memberName}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--color-text-primary)' }}>
                  {log.amount.toLocaleString()}
                </span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: '#ffc832' }}>
                  +{log.points}p
                </span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--color-text-muted)' }}>
                  {log.time}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tab: War ──────────────────────────────────────────────────────────────────

function WarTab({ raceColor, raceGlow }: { raceColor: string; raceGlow: string }) {
  const [showDeclare, setShowDeclare] = useState(false);
  const [targetTag, setTargetTag] = useState('');
  const activeWar = MOCK_WARS.find(w => w.isActive);
  const pastWars = MOCK_WARS.filter(w => !w.isActive);

  const STATUS_CONFIG: Record<WarStatus, { label: string; color: string; bg: string }> = {
    active:  { label: 'Aktif Savaş', color: '#ffc832', bg: 'rgba(255,200,50,0.10)' },
    victory: { label: 'Zafer',       color: '#44ff88', bg: 'rgba(68,255,136,0.10)' },
    defeat:  { label: 'Yenilgi',     color: '#ff3355', bg: 'rgba(255,51,85,0.10)'  },
    draw:    { label: 'Beraberlik',  color: '#888aaa', bg: 'rgba(136,138,170,0.10)' },
  };

  return (
    <div className="flex flex-col gap-6">
      {/* War stats header */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Zafer', value: MOCK_ALLIANCE.warWins, color: '#44ff88' },
          { label: 'Yenilgi', value: MOCK_ALLIANCE.warLosses, color: '#ff3355' },
          { label: 'Bölge', value: MOCK_ALLIANCE.territory, color: raceColor },
        ].map(stat => (
          <MangaPanel key={stat.label}>
            <div className="text-center py-3 px-2">
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, color: stat.color, textShadow: `0 0 16px ${stat.color}60` }}>
                {stat.value}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: 'var(--color-text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 2 }}>
                {stat.label}
              </div>
            </div>
          </MangaPanel>
        ))}
      </div>

      {/* Active war or no-war panel */}
      {activeWar ? (
        <MangaPanel glow thick>
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div
                  className="animate-pulse"
                  style={{ width: 8, height: 8, borderRadius: '50%', background: '#ffc832', boxShadow: '0 0 8px rgba(255,200,50,0.8)' }}
                />
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: '#ffc832', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                  Aktif Savaş
                </span>
              </div>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-text-muted)' }}>
                {activeWar.date}
              </span>
            </div>

            <div className="flex items-center justify-between">
              {/* Us */}
              <div className="text-center">
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: `${raceColor}18`,
                  border: `2px solid ${raceColor}60`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-display)',
                  fontSize: 14,
                  fontWeight: 900,
                  color: raceColor,
                  margin: '0 auto 6px',
                }}>
                  NV
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--color-text-primary)', letterSpacing: '0.08em' }}>Nebula Vanguard</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, color: raceColor, marginTop: 4 }}>{activeWar.ourScore}</div>
              </div>

              {/* VS */}
              <div className="flex flex-col items-center gap-1">
                <div className="speed-lines" style={{ width: 60, height: 40, position: 'relative', overflow: 'hidden' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 900, color: 'rgba(255,200,50,0.8)', letterSpacing: '0.1em', textShadow: '0 0 12px rgba(255,200,50,0.5)' }}>
                    VS
                  </span>
                </div>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: 'var(--color-text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                  Başlamadı
                </span>
              </div>

              {/* Opponent */}
              <div className="text-center">
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.06)',
                  border: '2px solid rgba(255,255,255,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-display)',
                  fontSize: 14,
                  fontWeight: 900,
                  color: 'var(--color-text-secondary)',
                  margin: '0 auto 6px',
                }}>
                  {activeWar.opponentTag}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--color-text-secondary)', letterSpacing: '0.08em' }}>{activeWar.opponent}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, color: 'var(--color-text-secondary)', marginTop: 4 }}>{activeWar.theirScore}</div>
              </div>
            </div>
          </div>
        </MangaPanel>
      ) : (
        <MangaPanel halftone>
          <div className="p-6 text-center">
            <div style={{ fontSize: 32, marginBottom: 8 }}>⚔️</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4, letterSpacing: '0.1em' }}>
              Aktif Savaş Yok
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-text-muted)' }}>
              Loncanı rakip ilan ederek zafer için savaş
            </div>
          </div>
        </MangaPanel>
      )}

      {/* Declare war button */}
      <div className="flex justify-center">
        <GlowButton
          onClick={() => setShowDeclare(!showDeclare)}
          size="lg"
          variant={showDeclare ? 'ghost' : 'primary'}
          icon={<span>⚔</span>}
        >
          {showDeclare ? 'İptal' : 'Savaş İlan Et'}
        </GlowButton>
      </div>

      {/* Declare war form */}
      {showDeclare && (
        <MangaPanel>
          <div className="p-4 flex flex-col gap-3">
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: 'var(--color-text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Hedef Lonca Etiketi
            </div>
            <div className="flex gap-2">
              <div
                className="flex-1 flex items-center px-3"
                style={{
                  height: 42,
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${targetTag ? raceColor + '50' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 8,
                  transition: 'border-color 0.2s ease',
                }}
              >
                <span style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-display)', fontSize: 12, marginRight: 8 }}>[</span>
                <input
                  value={targetTag}
                  onChange={e => setTargetTag(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder="ETIKET"
                  maxLength={6}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: raceColor,
                    fontFamily: 'var(--font-display)',
                    fontSize: 14,
                    fontWeight: 700,
                    letterSpacing: '0.15em',
                  }}
                />
                <span style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-display)', fontSize: 12, marginLeft: 8 }}>]</span>
              </div>
              <GlowButton
                size="md"
                disabled={targetTag.length < 2}
                onClick={() => { alert(`${targetTag} loncasına savaş ilan edildi!`); setShowDeclare(false); setTargetTag(''); }}
              >
                Onayla
              </GlowButton>
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              ⚠ Savaş ilanı lider onayı gerektirir. Savaş süresi 24 saattir.
            </div>
          </div>
        </MangaPanel>
      )}

      {/* War history */}
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: 'var(--color-text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>
          Savaş Geçmişi
        </div>
        <div className="flex flex-col gap-2">
          {pastWars.map(war => {
            const s = STATUS_CONFIG[war.status];
            return (
              <div
                key={war.id}
                className="flex items-center gap-3 px-4 py-3"
                style={{
                  background: s.bg,
                  border: `1px solid ${s.color}25`,
                  borderRadius: 10,
                }}
              >
                <div style={{ textAlign: 'center', minWidth: 40 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, color: s.color, letterSpacing: '0.1em' }}>
                    {s.label}
                  </div>
                </div>
                <div className="flex-1">
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    [{war.opponentTag}] {war.opponent}
                  </div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--color-text-muted)', marginTop: 1 }}>
                    {war.date}
                  </div>
                </div>
                <div className="text-right">
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: s.color }}>
                    {war.ourScore} — {war.theirScore}
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: 'var(--color-text-muted)', letterSpacing: '0.1em' }}>
                    {war.territory > 0 ? '+' : ''}{war.territory} bölge
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Tab = 'members' | 'chat' | 'donation' | 'war';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'members',  label: 'Üyeler', icon: '◈' },
  { id: 'chat',     label: 'Sohbet', icon: '◎' },
  { id: 'donation', label: 'Bağış',  icon: '◆' },
  { id: 'war',      label: 'Savaş',  icon: '⚔' },
];

export default function AlliancePage() {
  const { raceColor, raceGlow } = useRaceTheme();
  const [activeTab, setActiveTab] = useState<Tab>('members');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const xpPct = (MOCK_ALLIANCE.xp / MOCK_ALLIANCE.xpNext) * 100;

  return (
    <div
      className="min-h-[100dvh] flex flex-col relative"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Nebula background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'var(--gradient-nebula)', zIndex: 0 }}
        aria-hidden
      />
      <div className="fixed inset-0 halftone-bg pointer-events-none opacity-10" aria-hidden />
      {/* Race glow orb */}
      <div
        className="fixed pointer-events-none"
        style={{
          top: '-20%',
          right: '-10%',
          width: '50vw',
          height: '50vw',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${raceGlow}18 0%, transparent 70%)`,
          zIndex: 0,
        }}
        aria-hidden
      />

      {/* ── Header / Top bar ────────────────────────────────────────────────── */}
      <header
        className="relative z-20 flex items-center gap-3 px-4 py-3"
        style={{
          background: 'rgba(8,10,16,0.92)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <Link
          href="/"
          className="btn-ghost"
          style={{ padding: '6px 10px', fontSize: 16, display: 'flex', alignItems: 'center' }}
        >
          ←
        </Link>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 10,
            color: 'var(--color-text-muted)',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}
        >
          Lonca
        </span>
      </header>

      {/* ── Alliance identity panel ──────────────────────────────────────────── */}
      <div
        className="relative z-10"
        style={{
          background: 'rgba(8,10,16,0.88)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          className="max-w-2xl mx-auto px-4 py-5"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'none' : 'translateY(-8px)',
            transition: 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.32,0.72,0,1)',
          }}
        >
          <div className="flex items-start gap-4">
            {/* Emblem */}
            <AllianceEmblem tag={MOCK_ALLIANCE.tag} raceColor={raceColor} raceGlow={raceGlow} />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 18,
                    fontWeight: 900,
                    color: 'var(--color-text-primary)',
                    letterSpacing: '0.04em',
                  }}
                >
                  {MOCK_ALLIANCE.name}
                </h1>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.15em',
                    padding: '2px 8px',
                    borderRadius: 20,
                    background: `${raceColor}14`,
                    color: raceColor,
                    border: `1px solid ${raceColor}35`,
                  }}
                >
                  Sv.{MOCK_ALLIANCE.level}
                </span>
                {MOCK_ALLIANCE.isOpen && (
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      padding: '2px 8px',
                      borderRadius: 20,
                      background: 'rgba(68,255,136,0.10)',
                      color: '#44ff88',
                      border: '1px solid rgba(68,255,136,0.25)',
                    }}
                  >
                    AÇIK
                  </span>
                )}
              </div>

              {/* XP bar */}
              <div className="mb-2">
                <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', marginBottom: 3 }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${xpPct}%`,
                      borderRadius: 2,
                      background: `linear-gradient(90deg, ${raceColor}88 0%, ${raceColor} 100%)`,
                      boxShadow: `0 0 6px ${raceGlow}`,
                      transition: 'width 0.8s cubic-bezier(0.32,0.72,0,1)',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: 'var(--color-text-muted)', letterSpacing: '0.1em' }}>
                    {MOCK_ALLIANCE.xp.toLocaleString()} / {MOCK_ALLIANCE.xpNext.toLocaleString()} XP
                  </span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: raceColor, letterSpacing: '0.1em' }}>
                    Sv.{MOCK_ALLIANCE.level + 1} için {Math.round(xpPct)}%
                  </span>
                </div>
              </div>

              {/* Stat pills */}
              <div className="flex gap-3 flex-wrap">
                {[
                  { icon: '👥', value: `${MOCK_ALLIANCE.memberCount}/${MOCK_ALLIANCE.maxMembers}`, label: 'Üye' },
                  { icon: '⚡', value: `${(MOCK_ALLIANCE.totalPower / 1_000_000).toFixed(2)}M`, label: 'Güç' },
                  { icon: '🏆', value: `#${MOCK_ALLIANCE.globalRank}`, label: 'Sıra' },
                  { icon: '🌐', value: `${MOCK_ALLIANCE.territory}`, label: 'Bölge' },
                ].map(s => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 11 }}>{s.icon}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, color: 'var(--color-text-primary)' }}>{s.value}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: 'var(--color-text-muted)', letterSpacing: '0.1em' }}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────────────── */}
        <div
          className="max-w-2xl mx-auto px-4"
          style={{ display: 'flex', gap: 0 }}
        >
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  padding: '10px 4px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  borderBottom: `2px solid ${isActive ? raceColor : 'transparent'}`,
                  transition: 'border-color 0.25s ease',
                  position: 'relative',
                }}
              >
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: '20%',
                      right: '20%',
                      height: 2,
                      background: raceColor,
                      boxShadow: `0 0 8px ${raceGlow}`,
                      borderRadius: '2px 2px 0 0',
                    }}
                  />
                )}
                <span
                  style={{
                    fontSize: 14,
                    color: isActive ? raceColor : 'var(--color-text-muted)',
                    transition: 'color 0.25s ease',
                    textShadow: isActive ? `0 0 10px ${raceGlow}` : 'none',
                  }}
                >
                  {tab.icon}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: isActive ? raceColor : 'var(--color-text-muted)',
                    transition: 'color 0.25s ease',
                  }}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab content ──────────────────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        <div
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'none' : 'translateY(12px)',
            transition: 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.32,0.72,0,1)',
          }}
        >
          {activeTab === 'members'  && <MembersTab  raceColor={raceColor} raceGlow={raceGlow} />}
          {activeTab === 'chat'     && <ChatTab      raceColor={raceColor} raceGlow={raceGlow} />}
          {activeTab === 'donation' && <DonationTab  raceColor={raceColor} raceGlow={raceGlow} />}
          {activeTab === 'war'      && <WarTab       raceColor={raceColor} raceGlow={raceGlow} />}
        </div>
      </main>
    </div>
  );
}
