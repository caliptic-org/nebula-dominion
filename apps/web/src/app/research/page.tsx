'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { useRaceTheme } from '@/hooks/useRaceTheme';
import { MangaPanel } from '@/components/ui/MangaPanel';
import { GlowButton } from '@/components/ui/GlowButton';

// ── Types ─────────────────────────────────────────────────────────────────

type NodeState = 'locked' | 'available' | 'researching' | 'completed';
type CategoryId = 'ekonomi' | 'askeri' | 'savunma';

interface TechNodeData {
  id: string;
  name: string;
  icon: string;
  description: string;
  effect: string;
  tier: number;
  row: number;
  requires: string[];
  cost: { minerals: number; gas: number; timeSec: number };
  state: NodeState;
  progress?: number;
}

interface CategoryData {
  id: CategoryId;
  label: string;
  icon: string;
  nodes: TechNodeData[];
}

// ── Layout Constants ──────────────────────────────────────────────────────

const NODE_W = 104;
const NODE_H = 104;
const COL_GAP = 148;
const ROW_GAP = 40;
const PAD_X = 40;
const PAD_Y = 40;

function getNodePos(tier: number, row: number) {
  return {
    x: PAD_X + tier * (NODE_W + COL_GAP),
    y: PAD_Y + row * (NODE_H + ROW_GAP),
  };
}

function connectionPath(fromTier: number, fromRow: number, toTier: number, toRow: number) {
  const from = getNodePos(fromTier, fromRow);
  const to = getNodePos(toTier, toRow);
  const x0 = from.x + NODE_W;
  const y0 = from.y + NODE_H / 2;
  const x1 = to.x;
  const y1 = to.y + NODE_H / 2;
  const cx = (x0 + x1) / 2;
  return `M ${x0} ${y0} C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
}

function getCanvasDims(nodes: TechNodeData[]) {
  const maxTier = Math.max(...nodes.map((n) => n.tier));
  const maxRow = Math.max(...nodes.map((n) => n.row));
  return {
    w: PAD_X * 2 + (maxTier + 1) * NODE_W + maxTier * COL_GAP,
    h: PAD_Y * 2 + (maxRow + 1) * NODE_H + maxRow * ROW_GAP,
  };
}

function formatTime(sec: number) {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}d ${s}s` : `${m}d`;
}

// ── Tech Data ─────────────────────────────────────────────────────────────

const INITIAL_CATEGORIES: CategoryData[] = [
  {
    id: 'ekonomi',
    label: 'Ekonomi',
    icon: '⚙️',
    nodes: [
      {
        id: 'ek-madencilik', name: 'Temel Madencilik', icon: '⛏️',
        description: 'Mineral çıkarma kapasitesini artırır. Tüm madencilik yapıları %20 daha verimli çalışır ve depolama kapasitesi genişler.',
        effect: '+20% Mineral Üretimi',
        tier: 0, row: 0, requires: [],
        cost: { minerals: 200, gas: 0, timeSec: 120 },
        state: 'completed',
      },
      {
        id: 'ek-enerji', name: 'Enerji Santrali', icon: '⚡',
        description: 'Taban enerji kapasitesini genişletir. Savunma yapılarına %30 enerji bonusu sağlar.',
        effect: '+30% Enerji Kapasitesi',
        tier: 0, row: 1, requires: [],
        cost: { minerals: 150, gas: 50, timeSec: 90 },
        state: 'completed',
      },
      {
        id: 'ek-rafine', name: 'Gelişmiş Rafine', icon: '🔩',
        description: 'Ham minerallerden daha fazla saf kaynak elde edilir. Depolama kapasitesi %40 artar, kayıp oranı minimize edilir.',
        effect: '+40% Mineral Verimliliği',
        tier: 1, row: 0, requires: ['ek-madencilik'],
        cost: { minerals: 400, gas: 100, timeSec: 240 },
        state: 'researching',
        progress: 65,
      },
      {
        id: 'ek-verimlilik', name: 'Enerji Verimliliği', icon: '💎',
        description: 'Tüm yapıların enerji tüketimi azalır. Savaş gemilerinde yakıt tasarrufu sağlanır, üretim maliyeti düşer.',
        effect: '-25% Enerji Tüketimi',
        tier: 1, row: 1, requires: ['ek-enerji'],
        cost: { minerals: 300, gas: 150, timeSec: 180 },
        state: 'available',
      },
      {
        id: 'ek-mega', name: 'Mega Yapılar', icon: '🏗️',
        description: 'Dev nebula yapıları inşa edilebilir. Her mega yapı bağımsız bir ekonomik merkez işlevi görür ve pasif kaynak üretir.',
        effect: '+3 Mega Yapı Kapasitesi',
        tier: 2, row: 0, requires: ['ek-rafine'],
        cost: { minerals: 800, gas: 300, timeSec: 480 },
        state: 'locked',
      },
      {
        id: 'ek-kuantum', name: 'Kuantum Yakıt', icon: '🔮',
        description: 'Kuantum reaktörler sonsuz yakıt döngüsü oluşturur. Birlik hareket maliyetleri sıfıra iner, hızlı yeniden konumlanma aktif.',
        effect: '-100% Hareket Maliyeti',
        tier: 2, row: 1, requires: ['ek-verimlilik'],
        cost: { minerals: 600, gas: 400, timeSec: 420 },
        state: 'locked',
      },
    ],
  },
  {
    id: 'askeri',
    label: 'Askeri',
    icon: '⚔️',
    nodes: [
      {
        id: 'as-silah', name: 'Temel Silahlar', icon: '🗡️',
        description: 'Tüm saldırı birimlerinin hasar değeri artırılır. Menzil +1 hex genişler, kritik vuruş şansı yükselir.',
        effect: '+15% Saldırı Hasarı',
        tier: 0, row: 0, requires: [],
        cost: { minerals: 250, gas: 50, timeSec: 150 },
        state: 'completed',
      },
      {
        id: 'as-egitim', name: 'Birlik Eğitimi', icon: '🎯',
        description: 'Birim eğitim süresi %20 azalır. Eğitim kapasitesi iki katına çıkar ve deneyim kazanma hızı artar.',
        effect: '-20% Eğitim Süresi',
        tier: 0, row: 1, requires: [],
        cost: { minerals: 200, gas: 0, timeSec: 100 },
        state: 'available',
      },
      {
        id: 'as-taktik', name: 'Taktik Sistemler', icon: '📡',
        description: 'Birimler düşman zayıflıklarını otomatik analiz eder. Flanklama bonusları %50 artar, pusu kurma yeteneği kazanılır.',
        effect: '+50% Flanklama Bonusu',
        tier: 1, row: 0, requires: ['as-silah'],
        cost: { minerals: 450, gas: 150, timeSec: 300 },
        state: 'locked',
      },
      {
        id: 'as-zirh', name: 'Ağır Zırh', icon: '🛡️',
        description: 'Frontline birimler için ağır zırh protokolü aktive edilir. HP %25 artar, hasar direnci %10 yükselir.',
        effect: '+25% HP (Ön Saflar)',
        tier: 1, row: 1, requires: ['as-egitim'],
        cost: { minerals: 350, gas: 200, timeSec: 240 },
        state: 'locked',
      },
      {
        id: 'as-nukleer', name: 'Nükleer Protokol', icon: '☢️',
        description: 'Nebula reaktör silahları kullanılabilir hale gelir. AoE hasar yetenekleri açılır, radyasyon yavaşlatma efekti aktif.',
        effect: 'AoE Nükleer Saldırı',
        tier: 2, row: 0, requires: ['as-taktik'],
        cost: { minerals: 900, gas: 350, timeSec: 600 },
        state: 'locked',
      },
      {
        id: 'as-titan', name: 'Titan Savaşçı', icon: '🤖',
        description: 'Her ırka özgü dev titan birimi oluşturulabilir. Savaş alanında dominant güç sağlar, karşı koyulamaz yıkım gücü.',
        effect: 'Titan Birimi Açılır',
        tier: 2, row: 1, requires: ['as-zirh'],
        cost: { minerals: 750, gas: 500, timeSec: 540 },
        state: 'locked',
      },
    ],
  },
  {
    id: 'savunma',
    label: 'Savunma',
    icon: '🛡️',
    nodes: [
      {
        id: 'sv-tahkimat', name: 'Temel Tahkimat', icon: '🏰',
        description: 'Savunma yapılarının dayanıklılığı artırılır. Kale HP %30 yükselir, hasar emme kapasitesi güçlenir.',
        effect: '+30% Kale HP',
        tier: 0, row: 0, requires: [],
        cost: { minerals: 300, gas: 0, timeSec: 120 },
        state: 'completed',
      },
      {
        id: 'sv-duvar', name: 'Duvar İnşaatı', icon: '🧱',
        description: 'Enerji duvarları inşa edilebilir hale gelir. Düşman ilerleme yollarını engeller, çevre savunması güçlenir.',
        effect: 'Enerji Duvarı İnşaatı',
        tier: 0, row: 1, requires: [],
        cost: { minerals: 250, gas: 50, timeSec: 100 },
        state: 'completed',
      },
      {
        id: 'sv-kalkan', name: 'Enerji Kalkanı', icon: '🔵',
        description: 'Tüm savunma yapılarını saran yenilenen enerji kalkanı. Hasar emme kapasitesi +500, her tur 50 HP yenilenir.',
        effect: '+500 Kalkan HP',
        tier: 1, row: 0, requires: ['sv-tahkimat'],
        cost: { minerals: 500, gas: 250, timeSec: 360 },
        state: 'available',
      },
      {
        id: 'sv-mayin', name: 'Mayın Tarlası', icon: '💣',
        description: 'Otomatik tetiklemeli enerji mayınları düşman geçiş yollarına yerleştirilir. Gizli konumlandırma, hasar +80%.',
        effect: 'Otomatik Mayın Sistemi',
        tier: 1, row: 1, requires: ['sv-duvar'],
        cost: { minerals: 400, gas: 150, timeSec: 280 },
        state: 'locked',
      },
      {
        id: 'sv-kule', name: 'Yıkılmaz Kule', icon: '⭐',
        description: 'Kuantum zırhıyla kaplı süper savunma kulesi. Kale içi otomatik onarım mekanizması etkin, hasarı hafifletir.',
        effect: 'Oto-Onarım Kulesi',
        tier: 2, row: 0, requires: ['sv-kalkan'],
        cost: { minerals: 800, gas: 400, timeSec: 540 },
        state: 'locked',
      },
      {
        id: 'sv-nano', name: 'Nano Onarım', icon: '🧬',
        description: 'Nano-bot sürüleri savunma yapılarını savaş sırasında anlık onarır. Yavaş saldırılar tamamen etkisizleşir.',
        effect: '+50 HP/Tur Onarım',
        tier: 2, row: 1, requires: ['sv-mayin'],
        cost: { minerals: 700, gas: 350, timeSec: 480 },
        state: 'locked',
      },
    ],
  },
];

// ── Node State Styles ─────────────────────────────────────────────────────

function getNodeStyle(state: NodeState, raceColor: string, raceGlow: string) {
  switch (state) {
    case 'completed':
      return {
        border: `2px solid ${raceColor}`,
        background: `linear-gradient(135deg, ${raceColor}22 0%, ${raceColor}0a 100%)`,
        boxShadow: `0 0 16px ${raceGlow}, inset 0 1px 1px rgba(255,255,255,0.12)`,
        opacity: 1,
        iconColor: raceColor,
      };
    case 'researching':
      return {
        border: '2px solid #ffc832',
        background: 'linear-gradient(135deg, rgba(255,200,50,0.15) 0%, rgba(255,200,50,0.05) 100%)',
        boxShadow: '0 0 20px rgba(255,200,50,0.4), inset 0 1px 1px rgba(255,255,255,0.12)',
        opacity: 1,
        iconColor: '#ffc832',
      };
    case 'available':
      return {
        border: `2px solid ${raceColor}88`,
        background: `linear-gradient(135deg, ${raceColor}18 0%, ${raceColor}08 100%)`,
        boxShadow: `0 0 12px ${raceGlow}88`,
        opacity: 1,
        iconColor: raceColor,
      };
    case 'locked':
    default:
      return {
        border: '2px solid rgba(255,255,255,0.06)',
        background: 'rgba(8,10,16,0.6)',
        boxShadow: 'none',
        opacity: 0.45,
        iconColor: '#555d7a',
      };
  }
}

function getConnectionStyle(fromState: NodeState, toState: NodeState, raceColor: string) {
  if (fromState === 'completed' && (toState === 'completed' || toState === 'researching' || toState === 'available')) {
    return { stroke: raceColor, opacity: 0.7, dasharray: 'none', animated: false };
  }
  if (fromState === 'completed' && toState === 'locked') {
    return { stroke: raceColor, opacity: 0.25, dasharray: '6 8', animated: false };
  }
  if (fromState === 'researching') {
    return { stroke: '#ffc832', opacity: 0.5, dasharray: '4 6', animated: true };
  }
  return { stroke: 'rgba(255,255,255,0.10)', opacity: 1, dasharray: 'none', animated: false };
}

// ── Node Card Component ───────────────────────────────────────────────────

interface NodeCardProps {
  node: TechNodeData;
  raceColor: string;
  raceGlow: string;
  isSelected: boolean;
  onClick: () => void;
}

function NodeCard({ node, raceColor, raceGlow, isSelected, onClick }: NodeCardProps) {
  const style = getNodeStyle(node.state, raceColor, raceGlow);
  const pos = getNodePos(node.tier, node.row);

  return (
    <g
      transform={`translate(${pos.x}, ${pos.y})`}
      style={{ cursor: node.state === 'locked' ? 'not-allowed' : 'pointer' }}
      onClick={node.state !== 'locked' ? onClick : undefined}
      role="button"
      aria-label={node.name}
      aria-pressed={isSelected}
    >
      {/* Outer glow ring when selected */}
      {isSelected && (
        <rect
          x={-6} y={-6}
          width={NODE_W + 12} height={NODE_H + 12}
          rx={14} ry={14}
          fill="none"
          stroke={raceColor}
          strokeWidth={1.5}
          opacity={0.5}
          style={{ filter: `drop-shadow(0 0 8px ${raceColor})` }}
        />
      )}

      {/* Double-bezel outer shell */}
      <rect
        x={-2} y={-2}
        width={NODE_W + 4} height={NODE_H + 4}
        rx={12} ry={12}
        fill="rgba(255,255,255,0.03)"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={1}
      />

      {/* Inner core */}
      <rect
        x={0} y={0}
        width={NODE_W} height={NODE_H}
        rx={10} ry={10}
        fill={style.background as string}
        stroke={style.border.replace('2px solid ', '')}
        strokeWidth={2}
        opacity={style.opacity}
        style={{ filter: style.boxShadow !== 'none' ? `drop-shadow(0 0 8px ${style.iconColor}44)` : 'none' }}
      />

      {/* Halftone dots top-right corner */}
      <pattern id={`dot-${node.id}`} x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
        <circle cx="3" cy="3" r="0.8" fill="rgba(255,255,255,0.06)" />
      </pattern>
      <rect
        x={NODE_W - 36} y={0}
        width={36} height={36}
        rx={0} ry={0}
        fill={`url(#dot-${node.id})`}
        opacity={style.opacity}
        style={{ clipPath: `inset(0 0 0 0 round 0 10px 0 0)` }}
      />

      {/* Corner accent lines — manga panel style */}
      <line x1={0} y1={0} x2={20} y2={0} stroke="rgba(255,255,255,0.18)" strokeWidth={2} opacity={style.opacity} />
      <line x1={0} y1={0} x2={0} y2={16} stroke="rgba(255,255,255,0.18)" strokeWidth={2} opacity={style.opacity} />
      <line x1={NODE_W} y1={0} x2={NODE_W - 20} y2={0} stroke="rgba(255,255,255,0.18)" strokeWidth={2} opacity={style.opacity} />
      <line x1={NODE_W} y1={0} x2={NODE_W} y2={16} stroke="rgba(255,255,255,0.18)" strokeWidth={2} opacity={style.opacity} />

      {/* Icon */}
      <text
        x={NODE_W / 2} y={44}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={28}
        opacity={style.opacity}
      >
        {node.icon}
      </text>

      {/* State indicator badge — top right */}
      {node.state !== 'locked' && (
        <>
          <circle
            cx={NODE_W - 12} cy={12} r={10}
            fill={node.state === 'completed' ? raceColor : node.state === 'researching' ? '#ffc832' : raceColor}
            opacity={0.95}
          />
          <text
            x={NODE_W - 12} y={12}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={node.state === 'completed' ? 10 : 11}
            fill="#080a10"
            fontWeight="900"
          >
            {node.state === 'completed' ? '✓' : node.state === 'researching' ? '⚗' : '▶'}
          </text>
        </>
      )}

      {/* Lock icon */}
      {node.state === 'locked' && (
        <text
          x={NODE_W - 14} y={14}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={12}
          opacity={0.35}
        >
          🔒
        </text>
      )}

      {/* Node name — clamped at 2 lines */}
      <foreignObject x={6} y={56} width={NODE_W - 12} height={42}>
        <div
          style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '8.5px',
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: style.opacity < 1 ? '#555d7a' : style.iconColor,
            textAlign: 'center',
            lineHeight: 1.35,
            wordBreak: 'break-word',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            opacity: style.opacity,
          } as React.CSSProperties}
        >
          {node.name}
        </div>
      </foreignObject>

      {/* Research progress overlay */}
      {node.state === 'researching' && node.progress !== undefined && (
        <>
          <rect
            x={8} y={NODE_H - 14}
            width={NODE_W - 16} height={6}
            rx={3} ry={3}
            fill="rgba(255,200,50,0.15)"
          />
          <rect
            x={8} y={NODE_H - 14}
            width={Math.max(4, ((NODE_W - 16) * node.progress) / 100)}
            height={6}
            rx={3} ry={3}
            fill="#ffc832"
            style={{ filter: 'drop-shadow(0 0 4px rgba(255,200,50,0.8))' }}
          />
          <text
            x={NODE_W / 2} y={NODE_H - 18}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={7}
            fill="rgba(255,200,50,0.7)"
            fontFamily="Orbitron, sans-serif"
            fontWeight="700"
          >
            {node.progress}%
          </text>
        </>
      )}

      {/* Available pulse ring animation */}
      {node.state === 'available' && (
        <rect
          x={-4} y={-4}
          width={NODE_W + 8} height={NODE_H + 8}
          rx={14} ry={14}
          fill="none"
          stroke={raceColor}
          strokeWidth={1}
          opacity={0}
          style={{ animation: 'tech-pulse 2s ease-in-out infinite' }}
        />
      )}
    </g>
  );
}

// ── Detail Panel ──────────────────────────────────────────────────────────

interface DetailPanelProps {
  node: TechNodeData | null;
  nodes: TechNodeData[];
  raceColor: string;
  raceDim: string;
  raceGlow: string;
  onClose: () => void;
  onResearch: (id: string) => void;
  onCancel: (id: string) => void;
}

function DetailPanel({ node, nodes, raceColor, raceDim, raceGlow, onClose, onResearch, onCancel }: DetailPanelProps) {
  const visible = node !== null;

  const prereqNodes = useMemo(() => {
    if (!node) return [];
    return node.requires.map((id) => nodes.find((n) => n.id === id)).filter(Boolean) as TechNodeData[];
  }, [node, nodes]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end pointer-events-none"
      aria-hidden={!visible}
    >
      {/* Backdrop — mobile only */}
      {visible && (
        <div
          className="absolute inset-0 bg-black/50 sm:hidden pointer-events-auto"
          onClick={onClose}
          style={{ backdropFilter: 'blur(4px)' }}
        />
      )}

      <div
        className={clsx(
          'relative pointer-events-auto w-full sm:w-[380px] transition-all duration-500',
          'sm:m-4 sm:mr-6 sm:h-auto',
          visible
            ? 'translate-y-0 opacity-100 sm:translate-x-0'
            : 'translate-y-full opacity-0 sm:translate-x-[420px]',
        )}
        style={{
          transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)',
          maxHeight: '90dvh',
          overflow: 'hidden auto',
        }}
      >
        {/* Double-bezel outer shell */}
        <div
          className="p-[2px] rounded-2xl"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* Inner core */}
          <div
            className="rounded-[calc(1rem-2px)] overflow-hidden"
            style={{
              background: 'rgba(13,17,23,0.97)',
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.06)',
              backdropFilter: 'blur(40px)',
            }}
          >
            {/* Handle — mobile drag indicator */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {node && (
              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                      style={{
                        background: `${raceColor}18`,
                        border: `1.5px solid ${raceColor}40`,
                        boxShadow: `0 0 12px ${raceGlow}`,
                      }}
                    >
                      {node.icon}
                    </div>
                    <div>
                      <div className="mb-1">
                        <span
                          className="badge text-[9px]"
                          style={{ background: raceDim, color: raceColor, border: `1px solid ${raceColor}40` }}
                        >
                          {node.state === 'completed' ? '✓ Tamamlandı' : node.state === 'researching' ? '⚗ Araştırılıyor' : node.state === 'available' ? '▶ Hazır' : '🔒 Kilitli'}
                        </span>
                      </div>
                      <h2
                        className="font-display text-sm font-black leading-tight"
                        style={{ color: node.state === 'locked' ? '#a0a8c0' : raceColor }}
                      >
                        {node.name}
                      </h2>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary transition-colors shrink-0"
                    style={{ background: 'rgba(255,255,255,0.06)' }}
                    aria-label="Kapat"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>

                {/* Research progress bar */}
                {node.state === 'researching' && node.progress !== undefined && (
                  <div className="mb-4">
                    <div className="flex justify-between mb-1.5">
                      <span className="font-display text-[9px] uppercase tracking-widest text-text-muted">Araştırma İlerlemesi</span>
                      <span className="font-display text-[9px]" style={{ color: '#ffc832' }}>{node.progress}%</span>
                    </div>
                    <div
                      className="h-2 rounded-full overflow-hidden"
                      style={{ background: 'rgba(255,200,50,0.10)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${node.progress}%`,
                          background: 'linear-gradient(90deg, #ffc83288, #ffc832)',
                          boxShadow: '0 0 8px rgba(255,200,50,0.6)',
                          transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)',
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="font-display text-[9px] text-text-muted">
                        ~{formatTime(Math.round(node.cost.timeSec * (1 - node.progress / 100)))} kaldı
                      </span>
                    </div>
                  </div>
                )}

                {/* Description */}
                <p className="text-text-secondary text-xs leading-relaxed mb-4" style={{ fontFamily: 'var(--font-body)' }}>
                  {node.description}
                </p>

                {/* Effect chip */}
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
                  style={{
                    background: `${raceColor}14`,
                    border: `1px solid ${raceColor}30`,
                  }}
                >
                  <span className="text-base">✦</span>
                  <span
                    className="font-display text-[10px] font-black uppercase tracking-wide"
                    style={{ color: raceColor }}
                  >
                    {node.effect}
                  </span>
                </div>

                {/* Divider */}
                <div className="h-px mb-4" style={{ background: 'rgba(255,255,255,0.06)' }} />

                {/* Cost grid */}
                <div className="mb-4">
                  <div className="font-display text-[9px] uppercase tracking-widest text-text-muted mb-2">Maliyet</div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Mineral', value: node.cost.minerals.toLocaleString('tr-TR'), color: '#4a9eff', icon: '💠' },
                      { label: 'Gaz', value: node.cost.gas > 0 ? node.cost.gas.toLocaleString('tr-TR') : 'Yok', color: '#44ff88', icon: '🟢' },
                      { label: 'Süre', value: formatTime(node.cost.timeSec), color: '#ffc832', icon: '⏱' },
                    ].map((c) => (
                      <div
                        key={c.label}
                        className="p-2.5 rounded-xl text-center"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        <div className="text-base mb-1">{c.icon}</div>
                        <div
                          className="font-display text-xs font-black"
                          style={{ color: c.color }}
                        >
                          {c.value}
                        </div>
                        <div className="font-display text-[8px] uppercase tracking-widest text-text-muted mt-0.5">
                          {c.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Prerequisites */}
                {prereqNodes.length > 0 && (
                  <div className="mb-4">
                    <div className="font-display text-[9px] uppercase tracking-widest text-text-muted mb-2">Gereksinimler</div>
                    <div className="flex flex-wrap gap-2">
                      {prereqNodes.map((req) => (
                        <div
                          key={req.id}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                          style={{
                            background: req.state === 'completed'
                              ? `${raceColor}14`
                              : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${req.state === 'completed' ? `${raceColor}40` : 'rgba(255,255,255,0.08)'}`,
                          }}
                        >
                          <span className="text-xs">{req.state === 'completed' ? '✓' : '○'}</span>
                          <span
                            className="font-display text-[9px] font-bold uppercase tracking-wide"
                            style={{ color: req.state === 'completed' ? raceColor : '#555d7a' }}
                          >
                            {req.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action button */}
                {node.state === 'available' && (
                  <GlowButton
                    variant="primary"
                    size="md"
                    className="w-full"
                    onClick={() => onResearch(node.id)}
                  >
                    Araştırmayı Başlat
                  </GlowButton>
                )}
                {node.state === 'researching' && (
                  <button
                    className="w-full py-2.5 rounded-full font-display text-xs font-bold uppercase tracking-widest transition-all duration-300"
                    style={{
                      background: 'rgba(255,51,85,0.12)',
                      border: '1px solid rgba(255,51,85,0.3)',
                      color: '#ff3355',
                    }}
                    onClick={() => onCancel(node.id)}
                  >
                    Araştırmayı İptal Et
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Research Queue Strip ──────────────────────────────────────────────────

interface QueueStripProps {
  researching: TechNodeData | null;
  raceColor: string;
  raceGlow: string;
}

function QueueStrip({ researching, raceColor, raceGlow }: QueueStripProps) {
  if (!researching) {
    return (
      <div
        className="sticky bottom-0 z-40 px-4 py-3"
        style={{
          background: 'rgba(8,10,16,0.95)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="flex items-center gap-2 opacity-40">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <span className="text-sm">⚗</span>
            </div>
            <div>
              <div className="font-display text-[9px] uppercase tracking-widest text-text-muted">Araştırma Kuyruğu</div>
              <div className="font-display text-xs text-text-muted">Boş — Araştırılacak teknoloji seç</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="sticky bottom-0 z-40 px-4 py-3"
      style={{
        background: 'rgba(8,10,16,0.96)',
        borderTop: `1px solid ${raceColor}20`,
        backdropFilter: 'blur(20px)',
        boxShadow: `0 -8px 32px rgba(0,0,0,0.5)`,
      }}
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          {/* Queue icon */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
            style={{
              background: `${raceColor}18`,
              border: `1.5px solid ${raceColor}40`,
              boxShadow: `0 0 12px ${raceGlow}`,
            }}
          >
            {researching.icon}
          </div>

          {/* Name + progress */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="font-display text-xs font-bold truncate" style={{ color: '#ffc832' }}>
                {researching.name}
              </span>
              <span className="font-display text-[9px] text-text-muted ml-2 shrink-0">
                ~{formatTime(Math.round(researching.cost.timeSec * (1 - (researching.progress ?? 0) / 100)))} kaldı
              </span>
            </div>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: 'rgba(255,200,50,0.10)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${researching.progress ?? 0}%`,
                  background: 'linear-gradient(90deg, #ffc83266, #ffc832)',
                  boxShadow: '0 0 6px rgba(255,200,50,0.5)',
                  transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)',
                }}
              />
            </div>
          </div>

          {/* Percent badge */}
          <div
            className="shrink-0 font-display text-xs font-black px-2 py-1 rounded-full"
            style={{ background: 'rgba(255,200,50,0.12)', color: '#ffc832', border: '1px solid rgba(255,200,50,0.25)' }}
          >
            {researching.progress ?? 0}%
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Tech Tree SVG Canvas ─────────────────────────────────────────────

interface TechTreeCanvasProps {
  nodes: TechNodeData[];
  selectedId: string | null;
  raceColor: string;
  raceGlow: string;
  onSelectNode: (id: string) => void;
}

function TechTreeCanvas({ nodes, selectedId, raceColor, raceGlow, onSelectNode }: TechTreeCanvasProps) {
  const { w, h } = useMemo(() => getCanvasDims(nodes), [nodes]);
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const connections = useMemo(() => {
    const result: Array<{ from: TechNodeData; to: TechNodeData }> = [];
    for (const node of nodes) {
      for (const reqId of node.requires) {
        const req = nodeMap.get(reqId);
        if (req) result.push({ from: req, to: node });
      }
    }
    return result;
  }, [nodes, nodeMap]);

  return (
    <div
      className="overflow-x-auto overflow-y-hidden"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {/* Tier labels */}
      <div
        className="flex"
        style={{
          width: w,
          paddingLeft: PAD_X,
          paddingRight: PAD_X,
          gap: COL_GAP,
          marginBottom: 0,
        }}
      >
        {['Seviye I', 'Seviye II', 'Seviye III'].map((label) => (
          <div
            key={label}
            className="shrink-0 flex justify-center"
            style={{ width: NODE_W }}
          >
            <span
              className="font-display text-[9px] uppercase tracking-widest px-3 py-1 rounded-full"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#555d7a',
              }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        style={{ display: 'block', overflow: 'visible' }}
        aria-label="Teknoloji Ağacı"
      >
        <defs>
          {/* Neon glow filter */}
          <filter id="neon-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="neon-glow-strong" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Animated dash for researching connections */}
          <style>{`
            @keyframes dashFlow {
              to { stroke-dashoffset: -20; }
            }
            @keyframes tech-pulse {
              0%, 100% { opacity: 0; transform: scale(1); }
              50% { opacity: 0.4; transform: scale(1.04); }
            }
          `}</style>
        </defs>

        {/* Connection lines — drawn beneath nodes */}
        {connections.map(({ from, to }) => {
          const connStyle = getConnectionStyle(from.state, to.state, raceColor);
          const path = connectionPath(from.tier, from.row, to.tier, to.row);

          return (
            <g key={`${from.id}-${to.id}`}>
              {/* Glow layer */}
              {connStyle.opacity > 0.3 && (
                <path
                  d={path}
                  fill="none"
                  stroke={connStyle.stroke}
                  strokeWidth={6}
                  opacity={connStyle.opacity * 0.25}
                  strokeDasharray={connStyle.dasharray === 'none' ? undefined : connStyle.dasharray}
                  filter="url(#neon-glow)"
                />
              )}
              {/* Primary line */}
              <path
                d={path}
                fill="none"
                stroke={connStyle.stroke}
                strokeWidth={2}
                opacity={connStyle.opacity}
                strokeDasharray={connStyle.dasharray === 'none' ? undefined : connStyle.dasharray}
                style={connStyle.animated ? {
                  animation: 'dashFlow 0.8s linear infinite',
                  strokeDashoffset: 0,
                } : undefined}
                strokeLinecap="round"
              />
              {/* Arrow head at destination */}
              {connStyle.opacity > 0.2 && (() => {
                const toPos = getNodePos(to.tier, to.row);
                const arrowX = toPos.x;
                const arrowY = toPos.y + NODE_H / 2;
                return (
                  <polygon
                    points={`${arrowX},${arrowY} ${arrowX - 8},${arrowY - 5} ${arrowX - 8},${arrowY + 5}`}
                    fill={connStyle.stroke}
                    opacity={connStyle.opacity}
                  />
                );
              })()}
            </g>
          );
        })}

        {/* Node cards */}
        {nodes.map((node) => (
          <NodeCard
            key={node.id}
            node={node}
            raceColor={raceColor}
            raceGlow={raceGlow}
            isSelected={selectedId === node.id}
            onClick={() => onSelectNode(node.id)}
          />
        ))}
      </svg>
    </div>
  );
}

// ── Tier Column Labels with counters ─────────────────────────────────────

function TierProgress({ nodes, raceColor }: { nodes: TechNodeData[]; raceColor: string }) {
  const tiers = [0, 1, 2];
  return (
    <div className="flex gap-3 mb-4">
      {tiers.map((tier) => {
        const tierNodes = nodes.filter((n) => n.tier === tier);
        const done = tierNodes.filter((n) => n.state === 'completed').length;
        const pct = tierNodes.length > 0 ? (done / tierNodes.length) * 100 : 0;
        return (
          <div key={tier} className="flex-1">
            <div className="flex justify-between mb-1">
              <span className="font-display text-[8px] uppercase tracking-widest text-text-muted">Seviye {tier + 1}</span>
              <span className="font-display text-[8px]" style={{ color: raceColor }}>{done}/{tierNodes.length}</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${raceColor}66, ${raceColor})`,
                  transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function ResearchPage() {
  const { raceColor, raceDim, raceGlow } = useRaceTheme();
  const [activeCategory, setActiveCategory] = useState<CategoryId>('ekonomi');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryData[]>(INITIAL_CATEGORIES);

  const activeCategoryData = useMemo(
    () => categories.find((c) => c.id === activeCategory)!,
    [categories, activeCategory],
  );

  const selectedNode = useMemo(
    () => activeCategoryData.nodes.find((n) => n.id === selectedNodeId) ?? null,
    [activeCategoryData, selectedNodeId],
  );

  const researchingNode = useMemo(
    () => activeCategoryData.nodes.find((n) => n.state === 'researching') ?? null,
    [activeCategoryData],
  );

  const handleSelectNode = useCallback((id: string) => {
    setSelectedNodeId((prev) => (prev === id ? null : id));
  }, []);

  const handleResearch = useCallback((id: string) => {
    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        nodes: cat.nodes.map((n) => {
          if (n.id === id) return { ...n, state: 'researching' as NodeState, progress: 0 };
          return n;
        }),
      })),
    );
    setSelectedNodeId(null);
  }, []);

  const handleCancel = useCallback((id: string) => {
    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        nodes: cat.nodes.map((n) => {
          if (n.id === id) return { ...n, state: 'available' as NodeState, progress: undefined };
          return n;
        }),
      })),
    );
    setSelectedNodeId(null);
  }, []);

  const totalCompleted = useMemo(
    () => categories.flatMap((c) => c.nodes).filter((n) => n.state === 'completed').length,
    [categories],
  );
  const totalNodes = useMemo(() => categories.flatMap((c) => c.nodes).length, [categories]);

  return (
    <div
      className="min-h-[100dvh] flex flex-col relative"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Nebula background */}
      <div
        className="fixed inset-0 pointer-events-none transition-all duration-700"
        style={{ background: 'var(--gradient-nebula)', zIndex: 0 }}
        aria-hidden
      />
      <div className="fixed inset-0 halftone-bg pointer-events-none opacity-[0.12]" aria-hidden />

      {/* Scan line ambient effect */}
      <div
        className="fixed inset-x-0 h-px pointer-events-none opacity-10"
        style={{
          background: `linear-gradient(90deg, transparent, ${raceColor}, transparent)`,
          top: '35%',
          zIndex: 1,
          filter: `blur(1px)`,
        }}
        aria-hidden
      />

      {/* ── Sticky Header ── */}
      <header
        className="relative z-40 sticky top-0"
        style={{
          background: 'rgba(8,10,16,0.92)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(24px)',
        }}
      >
        {/* Top row */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="font-display text-text-muted text-xs hover:text-text-primary transition-colors flex items-center gap-1"
              style={{ transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}
            >
              ← Ana Üs
            </Link>
            <div className="h-3.5 w-px" style={{ background: 'rgba(255,255,255,0.10)' }} />
            <div className="flex items-center gap-2">
              <span
                className="badge text-[9px]"
                style={{ background: raceDim, color: raceColor, border: `1px solid ${raceColor}40` }}
              >
                Araştırma
              </span>
              <span
                className="font-display text-[10px] font-black"
                style={{ color: '#555d7a' }}
              >
                {totalCompleted}/{totalNodes}
              </span>
            </div>
          </div>

          {/* Resource mini-bar */}
          <div className="hidden sm:flex items-center gap-4">
            {[
              { icon: '💠', label: 'Mineral', value: '12,450', color: '#4a9eff' },
              { icon: '🟢', label: 'Gaz', value: '3,820', color: '#44ff88' },
            ].map((r) => (
              <div key={r.label} className="flex items-center gap-1.5">
                <span className="text-sm">{r.icon}</span>
                <div>
                  <div className="font-display text-[8px] uppercase tracking-widest text-text-muted leading-none">{r.label}</div>
                  <div className="font-display text-xs font-black leading-tight" style={{ color: r.color }}>
                    {r.value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category tabs */}
        <div
          className="flex border-t px-4 py-0"
          style={{ borderColor: 'rgba(255,255,255,0.05)' }}
        >
          {categories.map((cat) => {
            const active = cat.id === activeCategory;
            const catCompleted = cat.nodes.filter((n) => n.state === 'completed').length;
            const catTotal = cat.nodes.length;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  setSelectedNodeId(null);
                }}
                className="relative flex items-center gap-2 px-5 py-3 font-display text-xs font-bold uppercase tracking-widest transition-all duration-300"
                style={{
                  color: active ? raceColor : '#555d7a',
                  transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)',
                }}
                aria-selected={active}
              >
                <span className="text-sm">{cat.icon}</span>
                <span>{cat.label}</span>
                <span
                  className="font-display text-[8px] px-1.5 py-0.5 rounded-full"
                  style={{
                    background: active ? raceDim : 'rgba(255,255,255,0.04)',
                    color: active ? raceColor : '#555d7a',
                    border: active ? `1px solid ${raceColor}30` : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {catCompleted}/{catTotal}
                </span>
                {/* Active underline */}
                {active && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${raceColor}, transparent)`,
                      boxShadow: `0 0 8px ${raceGlow}`,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="relative z-10 flex-1 p-4 pb-6 max-w-5xl mx-auto w-full">

        {/* Category title + tier progress */}
        <div className="mb-5 animate-manga-appear">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">{activeCategoryData.icon}</span>
            <h1
              className="font-display text-xl font-black"
              style={{ color: raceColor, textShadow: `0 0 20px ${raceGlow}` }}
            >
              {activeCategoryData.label} Tech Tree
            </h1>
            <div className="flex-1 h-px" style={{ background: `${raceColor}18` }} />
          </div>
          <TierProgress nodes={activeCategoryData.nodes} raceColor={raceColor} />
        </div>

        {/* Tech Tree Canvas — double-bezel container */}
        <div
          className="p-[2px] rounded-2xl mb-5 animate-manga-appear"
          style={{
            animationDelay: '80ms',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <div
            className="rounded-[calc(1rem-2px)] overflow-hidden"
            style={{
              background: 'rgba(8,10,20,0.8)',
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.04)',
            }}
          >
            {/* Manga corner accents */}
            <div className="relative">
              <div className="absolute top-0 left-0 w-8 h-8 pointer-events-none z-10" aria-hidden>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M0 0 L16 0" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
                  <path d="M0 0 L0 16" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
                </svg>
              </div>
              <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none z-10" aria-hidden>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M32 0 L16 0" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
                  <path d="M32 0 L32 16" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
                </svg>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              <TechTreeCanvas
                key={activeCategory}
                nodes={activeCategoryData.nodes}
                selectedId={selectedNodeId}
                raceColor={raceColor}
                raceGlow={raceGlow}
                onSelectNode={handleSelectNode}
              />
            </div>
          </div>
        </div>

        {/* Legend */}
        <div
          className="flex flex-wrap gap-3 px-4 py-3 rounded-xl animate-manga-appear"
          style={{
            animationDelay: '160ms',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          {[
            { state: 'completed', label: 'Tamamlandı', color: raceColor },
            { state: 'researching', label: 'Araştırılıyor', color: '#ffc832' },
            { state: 'available', label: 'Araştırılabilir', color: raceColor },
            { state: 'locked', label: 'Kilitli', color: '#555d7a' },
          ].map((item) => (
            <div key={item.state} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-sm"
                style={{
                  background: item.state === 'locked' ? 'rgba(255,255,255,0.06)' : `${item.color}22`,
                  border: `1.5px solid ${item.state === 'locked' ? 'rgba(255,255,255,0.10)' : item.color}`,
                  opacity: item.state === 'locked' ? 0.5 : 1,
                }}
              />
              <span
                className="font-display text-[9px] uppercase tracking-wider"
                style={{ color: item.state === 'locked' ? '#555d7a' : item.color }}
              >
                {item.label}
              </span>
            </div>
          ))}
          <div className="ml-auto font-display text-[9px] text-text-muted">
            Node&apos;a tıkla → Detaylar
          </div>
        </div>
      </main>

      {/* ── Research Queue ── */}
      <QueueStrip
        researching={researchingNode}
        raceColor={raceColor}
        raceGlow={raceGlow}
      />

      {/* ── Node Detail Side Panel ── */}
      <DetailPanel
        node={selectedNode}
        nodes={activeCategoryData.nodes}
        raceColor={raceColor}
        raceDim={raceDim}
        raceGlow={raceGlow}
        onClose={() => setSelectedNodeId(null)}
        onResearch={handleResearch}
        onCancel={handleCancel}
      />

    </div>
  );
}
