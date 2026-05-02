export interface Reward {
  rank: number;
  rankLabel?: string;
  prize: string;
  prizeDetail?: string;
  raceColor?: string;
}

interface RewardTableProps {
  rewards: Reward[];
  accentColor?: string;
}

const RANK_STYLES: Record<number, { icon: string; color: string; glow: string }> = {
  1: { icon: '👑', color: '#ffc832', glow: 'rgba(255,200,50,0.4)' },
  2: { icon: '🥈', color: '#c0c0c0', glow: 'rgba(192,192,192,0.3)' },
  3: { icon: '🥉', color: '#cd7f32', glow: 'rgba(205,127,50,0.3)' },
};

function RankCell({ rank }: { rank: number }) {
  const style = RANK_STYLES[rank];
  if (style) {
    return (
      <div className="flex items-center gap-2">
        <span
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0"
          style={{
            background: `${style.glow}`,
            border: `1px solid ${style.color}50`,
            boxShadow: `0 0 12px ${style.glow}`,
            color: style.color,
          }}
          aria-hidden
        >
          {style.icon}
        </span>
        <span className="font-display font-black text-sm" style={{ color: style.color }}>
          #{rank}
        </span>
      </div>
    );
  }
  return (
    <span className="font-display font-bold text-sm text-text-muted">#{rank}</span>
  );
}

export function RewardTable({ rewards, accentColor = '#7b8cde' }: RewardTableProps) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        border: `1px solid ${accentColor}25`,
        background: 'rgba(0,0,0,0.4)',
      }}
    >
      {/* Header */}
      <div
        className="grid grid-cols-2 px-4 py-2.5"
        style={{
          background: `${accentColor}15`,
          borderBottom: `1px solid ${accentColor}20`,
        }}
      >
        <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: `${accentColor}aa` }}>
          SIRALAMA
        </span>
        <span className="text-[10px] font-bold tracking-widest uppercase text-right" style={{ color: `${accentColor}aa` }}>
          ÖDÜL
        </span>
      </div>

      {/* Rows */}
      {rewards.map((reward, i) => (
        <div
          key={reward.rank}
          className="grid grid-cols-2 items-center px-4 py-3 transition-all duration-300"
          style={{
            borderBottom: i < rewards.length - 1 ? `1px solid ${accentColor}10` : undefined,
            background: reward.rank <= 3
              ? `${RANK_STYLES[reward.rank]?.glow ?? 'transparent'}10`
              : 'transparent',
          }}
        >
          <RankCell rank={reward.rank} />
          <div className="text-right">
            <p
              className="font-display font-bold text-sm"
              style={{ color: reward.rank <= 3 ? RANK_STYLES[reward.rank].color : 'var(--color-text-primary)' }}
            >
              {reward.prize}
            </p>
            {reward.prizeDetail && (
              <p className="text-[10px] text-text-muted mt-0.5">{reward.prizeDetail}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
