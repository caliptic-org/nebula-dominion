'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import {
  ND,
  Sigil,
  Screen,
  Panel,
  Bar,
  Eyebrow,
  H2,
  H3,
  Caption,
  Chip,
  Code,
  NDButton,
  ResIcon,
  useNDRace,
  type NDRace,
} from '@/components/handoff';

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
    icon: '⚙',
    nodes: [
      {
        id: 'ek-madencilik', name: 'Temel Madencilik', icon: '⛏',
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
        id: 'ek-rafine', name: 'Gelişmiş Rafine', icon: '◈',
        description: 'Ham minerallerden daha fazla saf kaynak elde edilir. Depolama kapasitesi %40 artar, kayıp oranı minimize edilir.',
        effect: '+40% Mineral Verimliliği',
        tier: 1, row: 0, requires: ['ek-madencilik'],
        cost: { minerals: 400, gas: 100, timeSec: 240 },
        state: 'researching',
        progress: 65,
      },
      {
        id: 'ek-verimlilik', name: 'Enerji Verimliliği', icon: '◆',
        description: 'Tüm yapıların enerji tüketimi azalır. Savaş gemilerinde yakıt tasarrufu sağlanır, üretim maliyeti düşer.',
        effect: '-25% Enerji Tüketimi',
        tier: 1, row: 1, requires: ['ek-enerji'],
        cost: { minerals: 300, gas: 150, timeSec: 180 },
        state: 'available',
      },
      {
        id: 'ek-mega', name: 'Mega Yapılar', icon: '▦',
        description: 'Dev nebula yapıları inşa edilebilir. Her mega yapı bağımsız bir ekonomik merkez işlevi görür ve pasif kaynak üretir.',
        effect: '+3 Mega Yapı Kapasitesi',
        tier: 2, row: 0, requires: ['ek-rafine'],
        cost: { minerals: 800, gas: 300, timeSec: 480 },
        state: 'locked',
      },
      {
        id: 'ek-kuantum', name: 'Kuantum Yakıt', icon: '◉',
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
    icon: '⚔',
    nodes: [
      {
        id: 'as-silah', name: 'Temel Silahlar', icon: '†',
        description: 'Tüm saldırı birimlerinin hasar değeri artırılır. Menzil +1 hex genişler, kritik vuruş şansı yükselir.',
        effect: '+15% Saldırı Hasarı',
        tier: 0, row: 0, requires: [],
        cost: { minerals: 250, gas: 50, timeSec: 150 },
        state: 'completed',
      },
      {
        id: 'as-egitim', name: 'Birlik Eğitimi', icon: '◎',
        description: 'Birim eğitim süresi %20 azalır. Eğitim kapasitesi iki katına çıkar ve deneyim kazanma hızı artar.',
        effect: '-20% Eğitim Süresi',
        tier: 0, row: 1, requires: [],
        cost: { minerals: 200, gas: 0, timeSec: 100 },
        state: 'available',
      },
      {
        id: 'as-taktik', name: 'Taktik Sistemler', icon: '◐',
        description: 'Birimler düşman zayıflıklarını otomatik analiz eder. Flanklama bonusları %50 artar, pusu kurma yeteneği kazanılır.',
        effect: '+50% Flanklama Bonusu',
        tier: 1, row: 0, requires: ['as-silah'],
        cost: { minerals: 450, gas: 150, timeSec: 300 },
        state: 'locked',
      },
      {
        id: 'as-zirh', name: 'Ağır Zırh', icon: '◇',
        description: 'Frontline birimler için ağır zırh protokolü aktive edilir. HP %25 artar, hasar direnci %10 yükselir.',
        effect: '+25% HP (Ön Saflar)',
        tier: 1, row: 1, requires: ['as-egitim'],
        cost: { minerals: 350, gas: 200, timeSec: 240 },
        state: 'locked',
      },
      {
        id: 'as-nukleer', name: 'Nükleer Protokol', icon: '☢',
        description: 'Nebula reaktör silahları kullanılabilir hale gelir. AoE hasar yetenekleri açılır, radyasyon yavaşlatma efekti aktif.',
        effect: 'AoE Nükleer Saldırı',
        tier: 2, row: 0, requires: ['as-taktik'],
        cost: { minerals: 900, gas: 350, timeSec: 600 },
        state: 'locked',
      },
      {
        id: 'as-titan', name: 'Titan Savaşçı', icon: '⬢',
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
    icon: '◈',
    nodes: [
      {
        id: 'sv-tahkimat', name: 'Temel Tahkimat', icon: '▣',
        description: 'Savunma yapılarının dayanıklılığı artırılır. Kale HP %30 yükselir, hasar emme kapasitesi güçlenir.',
        effect: '+30% Kale HP',
        tier: 0, row: 0, requires: [],
        cost: { minerals: 300, gas: 0, timeSec: 120 },
        state: 'completed',
      },
      {
        id: 'sv-duvar', name: 'Duvar İnşaatı', icon: '▤',
        description: 'Enerji duvarları inşa edilebilir hale gelir. Düşman ilerleme yollarını engeller, çevre savunması güçlenir.',
        effect: 'Enerji Duvarı İnşaatı',
        tier: 0, row: 1, requires: [],
        cost: { minerals: 250, gas: 50, timeSec: 100 },
        state: 'completed',
      },
      {
        id: 'sv-kalkan', name: 'Enerji Kalkanı', icon: '◯',
        description: 'Tüm savunma yapılarını saran yenilenen enerji kalkanı. Hasar emme kapasitesi +500, her tur 50 HP yenilenir.',
        effect: '+500 Kalkan HP',
        tier: 1, row: 0, requires: ['sv-tahkimat'],
        cost: { minerals: 500, gas: 250, timeSec: 360 },
        state: 'available',
      },
      {
        id: 'sv-mayin', name: 'Mayın Tarlası', icon: '✦',
        description: 'Otomatik tetiklemeli enerji mayınları düşman geçiş yollarına yerleştirilir. Gizli konumlandırma, hasar +80%.',
        effect: 'Otomatik Mayın Sistemi',
        tier: 1, row: 1, requires: ['sv-duvar'],
        cost: { minerals: 400, gas: 150, timeSec: 280 },
        state: 'locked',
      },
      {
        id: 'sv-kule', name: 'Yıkılmaz Kule', icon: '★',
        description: 'Kuantum zırhıyla kaplı süper savunma kulesi. Kale içi otomatik onarım mekanizması etkin, hasarı hafifletir.',
        effect: 'Oto-Onarım Kulesi',
        tier: 2, row: 0, requires: ['sv-kalkan'],
        cost: { minerals: 800, gas: 400, timeSec: 540 },
        state: 'locked',
      },
      {
        id: 'sv-nano', name: 'Nano Onarım', icon: '⌬',
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

function getNodeStyle(state: NodeState, race: NDRace) {
  switch (state) {
    case 'completed':
      return {
        border: `2px solid ${race.primary}`,
        background: `linear-gradient(135deg, ${race.primary}22 0%, ${race.primary}0a 100%)`,
        boxShadow: `0 0 16px ${race.glow}, inset 0 1px 1px rgba(255,255,255,0.12)`,
        opacity: 1,
        iconColor: race.primary,
      };
    case 'researching':
      return {
        border: `2px solid ${ND.warn}`,
        background: `linear-gradient(135deg, ${ND.warn}26 0%, ${ND.warn}0d 100%)`,
        boxShadow: `0 0 20px ${ND.warn}66, inset 0 1px 1px rgba(255,255,255,0.12)`,
        opacity: 1,
        iconColor: ND.warn,
      };
    case 'available':
      return {
        border: `2px solid ${race.primary}88`,
        background: `linear-gradient(135deg, ${race.primary}18 0%, ${race.primary}08 100%)`,
        boxShadow: `0 0 12px ${race.glow}88`,
        opacity: 1,
        iconColor: race.primary,
      };
    case 'locked':
    default:
      return {
        border: `2px solid ${ND.border}`,
        background: ND.bgDeep,
        boxShadow: 'none',
        opacity: 0.45,
        iconColor: ND.textMute,
      };
  }
}

function getConnectionStyle(fromState: NodeState, toState: NodeState, race: NDRace) {
  if (fromState === 'completed' && (toState === 'completed' || toState === 'researching' || toState === 'available')) {
    return { stroke: race.primary, opacity: 0.7, dasharray: 'none', animated: false };
  }
  if (fromState === 'completed' && toState === 'locked') {
    return { stroke: race.primary, opacity: 0.25, dasharray: '6 8', animated: false };
  }
  if (fromState === 'researching') {
    return { stroke: ND.warn, opacity: 0.5, dasharray: '4 6', animated: true };
  }
  return { stroke: ND.border, opacity: 1, dasharray: 'none', animated: false };
}

// ── Node Card Component ───────────────────────────────────────────────────

interface NodeCardProps {
  node: TechNodeData;
  race: NDRace;
  isSelected: boolean;
  onClick: () => void;
}

function NodeCard({ node, race, isSelected, onClick }: NodeCardProps) {
  const style = getNodeStyle(node.state, race);
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
      {isSelected && (
        <rect
          x={-6} y={-6}
          width={NODE_W + 12} height={NODE_H + 12}
          rx={6} ry={6}
          fill="none"
          stroke={race.primary}
          strokeWidth={1.5}
          opacity={0.5}
          style={{ filter: `drop-shadow(0 0 8px ${race.primary})` }}
        />
      )}

      <rect
        x={-2} y={-2}
        width={NODE_W + 4} height={NODE_H + 4}
        rx={4} ry={4}
        fill="rgba(255,255,255,0.03)"
        stroke={ND.border}
        strokeWidth={1}
      />

      <rect
        x={0} y={0}
        width={NODE_W} height={NODE_H}
        rx={3} ry={3}
        fill={style.background as string}
        stroke={style.border.replace('2px solid ', '')}
        strokeWidth={2}
        opacity={style.opacity}
        style={{ filter: style.boxShadow !== 'none' ? `drop-shadow(0 0 8px ${style.iconColor}44)` : 'none' }}
      />

      <text
        x={NODE_W / 2} y={44}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={28}
        opacity={style.opacity}
        fill={style.iconColor}
      >
        {node.icon}
      </text>

      {node.state !== 'locked' && (
        <>
          <circle
            cx={NODE_W - 12} cy={12} r={10}
            fill={node.state === 'researching' ? ND.warn : race.primary}
            opacity={0.95}
          />
          <text
            x={NODE_W - 12} y={12}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={node.state === 'completed' ? 10 : 11}
            fill={ND.bg}
            fontWeight="900"
          >
            {node.state === 'completed' ? '✓' : node.state === 'researching' ? '⚗' : '▶'}
          </text>
        </>
      )}

      {node.state === 'locked' && (
        <text
          x={NODE_W - 14} y={14}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={12}
          opacity={0.35}
          fill={ND.textMute}
        >
          ⌧
        </text>
      )}

      <foreignObject x={6} y={56} width={NODE_W - 12} height={42}>
        <div
          style={{
            fontFamily: ND.display,
            fontSize: '8.5px',
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: style.opacity < 1 ? ND.textMute : style.iconColor,
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

      {node.state === 'researching' && node.progress !== undefined && (
        <>
          <rect
            x={8} y={NODE_H - 14}
            width={NODE_W - 16} height={6}
            rx={2} ry={2}
            fill={`${ND.warn}26`}
          />
          <rect
            x={8} y={NODE_H - 14}
            width={Math.max(4, ((NODE_W - 16) * node.progress) / 100)}
            height={6}
            rx={2} ry={2}
            fill={ND.warn}
            style={{ filter: `drop-shadow(0 0 4px ${ND.warn}cc)` }}
          />
          <text
            x={NODE_W / 2} y={NODE_H - 18}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={7}
            fill={`${ND.warn}b3`}
            fontFamily={ND.display}
            fontWeight="700"
          >
            {node.progress}%
          </text>
        </>
      )}

      {node.state === 'available' && (
        <rect
          x={-4} y={-4}
          width={NODE_W + 8} height={NODE_H + 8}
          rx={6} ry={6}
          fill="none"
          stroke={race.primary}
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
  race: NDRace;
  onClose: () => void;
  onResearch: (id: string) => void;
  onCancel: (id: string) => void;
}

function DetailPanel({ node, nodes, race, onClose, onResearch, onCancel }: DetailPanelProps) {
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
      {visible && (
        <div
          className="absolute inset-0 sm:hidden pointer-events-auto"
          onClick={onClose}
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
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
        <Panel race={race} hi glow style={{ overflow: 'hidden' }}>
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div style={{ width: 40, height: 4, borderRadius: 2, background: ND.border }} />
          </div>

          {node && (
            <div style={{ padding: 20 }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 24,
                      flexShrink: 0,
                      background: `${race.primary}18`,
                      border: `1.5px solid ${race.primary}66`,
                      boxShadow: `0 0 12px ${race.glow}66`,
                      color: race.primary,
                    }}
                  >
                    {node.icon}
                  </div>
                  <div>
                    <Chip color={node.state === 'researching' ? ND.warn : node.state === 'completed' ? race.primary : node.state === 'available' ? race.primary : ND.textMute}>
                      {node.state === 'completed' ? '✓ Tamamlandı' : node.state === 'researching' ? '⚗ Araştırılıyor' : node.state === 'available' ? '▶ Hazır' : '⌧ Kilitli'}
                    </Chip>
                    <H3 style={{ marginTop: 6, color: node.state === 'locked' ? ND.textDim : race.primary }}>
                      {node.name}
                    </H3>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  type="button"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 4,
                    border: `1px solid ${ND.border}`,
                    background: 'transparent',
                    color: ND.textDim,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    cursor: 'pointer',
                  }}
                  aria-label="Kapat"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {/* Research progress */}
              {node.state === 'researching' && node.progress !== undefined && (
                <div style={{ marginBottom: 16 }}>
                  <Bar
                    value={node.progress}
                    color={ND.warn}
                    label="ARAŞTIRMA İLERLEMESİ"
                    trailing={`${node.progress}%`}
                  />
                  <div style={{ marginTop: 6 }}>
                    <Caption style={{ fontSize: 10 }}>
                      ~{formatTime(Math.round(node.cost.timeSec * (1 - node.progress / 100)))} kaldı
                    </Caption>
                  </div>
                </div>
              )}

              {/* Description */}
              <Caption style={{ marginBottom: 16, lineHeight: 1.55 }}>
                {node.description}
              </Caption>

              {/* Effect chip */}
              <div style={{ marginBottom: 16 }}>
                <Chip color={race.primary} style={{ fontSize: 10, padding: '4px 10px' }}>
                  ✦ {node.effect}
                </Chip>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: ND.border, marginBottom: 16 }} />

              {/* Cost grid */}
              <div style={{ marginBottom: 16 }}>
                <Eyebrow color={race.primary}>MALİYET</Eyebrow>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 8 }}>
                  {[
                    { label: 'Mineral', value: node.cost.minerals.toLocaleString('tr-TR'), color: race.primary, icon: 'min' as const },
                    { label: 'Gaz', value: node.cost.gas > 0 ? node.cost.gas.toLocaleString('tr-TR') : '—', color: ND.ok, icon: 'energy' as const },
                    { label: 'Süre', value: formatTime(node.cost.timeSec), color: ND.warn, icon: 'sci' as const },
                  ].map((c) => (
                    <div
                      key={c.label}
                      style={{
                        padding: 10,
                        textAlign: 'center',
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${ND.border}`,
                        borderRadius: 3,
                      }}
                    >
                      <div style={{ marginBottom: 4 }}><ResIcon kind={c.icon} size={14} color={c.color} /></div>
                      <div style={{ fontFamily: ND.display, fontSize: 12, fontWeight: 700, color: c.color }}>
                        {c.value}
                      </div>
                      <Eyebrow style={{ fontSize: 8, marginTop: 2 }}>{c.label}</Eyebrow>
                    </div>
                  ))}
                </div>
              </div>

              {/* Prerequisites */}
              {prereqNodes.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <Eyebrow color={race.primary}>GEREKSİNİMLER</Eyebrow>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {prereqNodes.map((req) => (
                      <Chip
                        key={req.id}
                        color={req.state === 'completed' ? race.primary : ND.textMute}
                      >
                        {req.state === 'completed' ? '✓' : '○'} {req.name}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}

              {/* Action */}
              {node.state === 'available' && (
                <NDButton race={race} full size="md" onClick={() => onResearch(node.id)}>
                  Araştırmayı Başlat
                </NDButton>
              )}
              {node.state === 'researching' && (
                <NDButton variant="danger" full size="md" onClick={() => onCancel(node.id)}>
                  Araştırmayı İptal Et
                </NDButton>
              )}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

// ── Research Queue Strip ──────────────────────────────────────────────────

interface QueueStripProps {
  researching: TechNodeData | null;
  race: NDRace;
}

function QueueStrip({ researching, race }: QueueStripProps) {
  if (!researching) {
    return (
      <div
        style={{
          flexShrink: 0,
          padding: '12px 16px',
          background: 'linear-gradient(180deg, rgba(6,8,15,0.55), rgba(6,8,15,0.95))',
          borderTop: `1px solid ${ND.border}`,
          backdropFilter: 'blur(20px)',
        }}
      >
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12, opacity: 0.5 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 4,
              border: `1px solid ${ND.border}`,
              background: ND.surface,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: ND.display,
              color: ND.textDim,
            }}
          >
            ⚗
          </div>
          <div>
            <Eyebrow>ARAŞTIRMA KUYRUĞU</Eyebrow>
            <Caption style={{ fontSize: 11 }}>Boş — Araştırılacak teknoloji seç</Caption>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        flexShrink: 0,
        padding: '12px 16px',
        background: 'linear-gradient(180deg, rgba(6,8,15,0.55), rgba(6,8,15,0.97))',
        borderTop: `1px solid ${race.primary}33`,
        backdropFilter: 'blur(20px)',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            flexShrink: 0,
            background: `${race.primary}18`,
            border: `1.5px solid ${race.primary}66`,
            boxShadow: `0 0 12px ${race.glow}66`,
            color: race.primary,
          }}
        >
          {researching.icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
            <span style={{ fontFamily: ND.display, fontSize: 12, fontWeight: 700, color: ND.warn, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {researching.name}
            </span>
            <Code style={{ flexShrink: 0 }}>
              ~{formatTime(Math.round(researching.cost.timeSec * (1 - (researching.progress ?? 0) / 100)))} kaldı
            </Code>
          </div>
          <Bar value={researching.progress ?? 0} color={ND.warn} height={5} />
        </div>

        <div style={{ flexShrink: 0 }}>
          <Chip color={ND.warn}>{researching.progress ?? 0}%</Chip>
        </div>
      </div>
    </div>
  );
}

// ── Main Tech Tree SVG Canvas ─────────────────────────────────────────────

interface TechTreeCanvasProps {
  nodes: TechNodeData[];
  selectedId: string | null;
  race: NDRace;
  onSelectNode: (id: string) => void;
}

function TechTreeCanvas({ nodes, selectedId, race, onSelectNode }: TechTreeCanvasProps) {
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
        style={{
          display: 'flex',
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
            style={{ flexShrink: 0, display: 'flex', justifyContent: 'center', width: NODE_W }}
          >
            <Chip>{label}</Chip>
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
          <filter id="neon-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
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

        {/* Connection lines */}
        {connections.map(({ from, to }) => {
          const connStyle = getConnectionStyle(from.state, to.state, race);
          const path = connectionPath(from.tier, from.row, to.tier, to.row);

          return (
            <g key={`${from.id}-${to.id}`}>
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

        {/* Nodes */}
        {nodes.map((node) => (
          <NodeCard
            key={node.id}
            node={node}
            race={race}
            isSelected={selectedId === node.id}
            onClick={() => onSelectNode(node.id)}
          />
        ))}
      </svg>
    </div>
  );
}

// ── Tier Progress ─────────────────────────────────────────────────────────

function TierProgress({ nodes, race }: { nodes: TechNodeData[]; race: NDRace }) {
  const tiers = [0, 1, 2];
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
      {tiers.map((tier) => {
        const tierNodes = nodes.filter((n) => n.tier === tier);
        const done = tierNodes.filter((n) => n.state === 'completed').length;
        const pct = tierNodes.length > 0 ? (done / tierNodes.length) * 100 : 0;
        return (
          <div key={tier} style={{ flex: 1 }}>
            <Bar
              value={pct}
              color={race.primary}
              height={4}
              label={`SEVİYE ${tier + 1}`}
              trailing={`${done}/${tierNodes.length}`}
            />
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function ResearchPage() {
  const race = useNDRace();
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
    <Screen race={race} style={{ minHeight: '100dvh' }}>
      {/* Header */}
      <header
        style={{
          background: 'linear-gradient(180deg, rgba(6,8,15,0.95), rgba(6,8,15,0.55))',
          borderBottom: `1px solid ${race.primary}33`,
          backdropFilter: 'blur(20px)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px' }}>
          <Link
            href="/"
            aria-label="Geri"
            style={{
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
            }}
          >
            ‹
          </Link>
          <Sigil race={race} size={28} glow />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Eyebrow color={race.primary}>ARAŞTIRMA</Eyebrow>
            <H2 style={{ marginTop: 2 }}>TECH TREE</H2>
          </div>
          <Chip color={race.primary}>{totalCompleted}/{totalNodes}</Chip>
        </div>

        {/* Category tabs */}
        <div role="tablist" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, padding: '0 16px 12px' }}>
          {categories.map((cat) => {
            const on = cat.id === activeCategory;
            const done = cat.nodes.filter((n) => n.state === 'completed').length;
            return (
              <button
                key={cat.id}
                role="tab"
                aria-selected={on}
                type="button"
                onClick={() => {
                  setActiveCategory(cat.id);
                  setSelectedNodeId(null);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '10px 6px',
                  fontFamily: ND.display,
                  fontSize: 11,
                  letterSpacing: '0.10em',
                  textTransform: 'uppercase',
                  background: on ? `linear-gradient(180deg, ${race.primary}28, ${race.primary}10)` : 'transparent',
                  border: `1px solid ${on ? race.primary : ND.border}`,
                  color: on ? race.primary : ND.textDim,
                  borderRadius: 3,
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 13 }}>{cat.icon}</span>
                <span>{cat.label}</span>
                <span style={{ fontFamily: ND.mono, fontSize: 9, color: on ? race.primary : ND.textMute }}>
                  {done}/{cat.nodes.length}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main */}
      <main
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '16px',
          paddingBottom: 24,
          width: '100%',
        }}
      >
       <div style={{ maxWidth: 1024, margin: '0 auto', width: '100%' }}>
        {/* Category title + tier progress */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 20 }}>{activeCategoryData.icon}</span>
            <H3 style={{ color: ND.text }}>{activeCategoryData.label.toUpperCase()} TECH TREE</H3>
            <div style={{ flex: 1, height: 1, background: ND.border }} aria-hidden />
          </div>
          <TierProgress nodes={activeCategoryData.nodes} race={race} />
        </div>

        {/* Tech Tree Canvas */}
        <div style={{ marginBottom: 20 }}>
          <Panel race={race} hi style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: 16 }}>
              <TechTreeCanvas
                key={activeCategory}
                nodes={activeCategoryData.nodes}
                selectedId={selectedNodeId}
                race={race}
                onSelectNode={handleSelectNode}
              />
            </div>
          </Panel>
        </div>

        {/* Legend */}
        <Panel race={race} style={{ padding: 12 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
            {[
              { state: 'completed', label: 'Tamamlandı', color: race.primary },
              { state: 'researching', label: 'Araştırılıyor', color: ND.warn },
              { state: 'available', label: 'Araştırılabilir', color: race.primary },
              { state: 'locked', label: 'Kilitli', color: ND.textMute },
            ].map((item) => (
              <div key={item.state} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div
                  style={{
                    width: 12,
                    height: 12,
                    background: item.state === 'locked' ? ND.bgDeep : `${item.color}22`,
                    border: `1.5px solid ${item.color}`,
                    opacity: item.state === 'locked' ? 0.5 : 1,
                  }}
                />
                <span
                  style={{
                    fontFamily: ND.display,
                    fontSize: 10,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: item.state === 'locked' ? ND.textMute : item.color,
                  }}
                >
                  {item.label}
                </span>
              </div>
            ))}
            <div style={{ marginLeft: 'auto' }}>
              <Caption style={{ fontSize: 10 }}>Düğüme tıkla → Detaylar</Caption>
            </div>
          </div>
        </Panel>
       </div>
      </main>

      {/* Research Queue */}
      <QueueStrip researching={researchingNode} race={race} />

      {/* Node Detail Side Panel */}
      <DetailPanel
        node={selectedNode}
        nodes={activeCategoryData.nodes}
        race={race}
        onClose={() => setSelectedNodeId(null)}
        onResearch={handleResearch}
        onCancel={handleCancel}
      />
    </Screen>
  );
}
