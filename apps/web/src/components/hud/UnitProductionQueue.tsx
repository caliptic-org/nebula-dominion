'use client';

import { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';
import { useRaceTheme } from '@/hooks/useRaceTheme';

export interface ProductionQueueItem {
  id: string;
  unitType: string;
  unitEmoji: string;
  level: number;
  queuePosition: number;
  totalTimeSeconds: number;
  remainingTimeSeconds: number;
}

interface UnitProductionQueueProps {
  queue?: ProductionQueueItem[];
}

const DEMO_QUEUE: ProductionQueueItem[] = [
  {
    id: 'q1',
    unitType: 'Marine',
    unitEmoji: '⚔️',
    level: 3,
    queuePosition: 1,
    totalTimeSeconds: 120,
    remainingTimeSeconds: 45,
  },
  {
    id: 'q2',
    unitType: 'Medic',
    unitEmoji: '💊',
    level: 2,
    queuePosition: 2,
    totalTimeSeconds: 90,
    remainingTimeSeconds: 90,
  },
  {
    id: 'q3',
    unitType: 'Ghost',
    unitEmoji: '👻',
    level: 4,
    queuePosition: 3,
    totalTimeSeconds: 180,
    remainingTimeSeconds: 180,
  },
];

function formatTime(seconds: number): string {
  if (seconds <= 0) return '✓';
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)}s`;
  if (seconds >= 60) return `${Math.floor(seconds / 60)}d ${seconds % 60}sn`;
  return `${seconds}sn`;
}

function TimerBar({
  total,
  remaining,
  raceColor,
  raceGlow,
  isActive,
}: {
  total: number;
  remaining: number;
  raceColor: string;
  raceGlow: string;
  isActive: boolean;
}) {
  const pct = Math.max(0, Math.min(100, ((total - remaining) / total) * 100));
  const nearComplete = pct > 80;

  return (
    <div
      className="relative w-full h-[5px] rounded-full overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.07)' }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {isActive ? (
        <>
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-linear"
            style={{
              width: `${pct}%`,
              background: nearComplete
                ? `linear-gradient(90deg, ${raceColor}, #ffaa22)`
                : `linear-gradient(90deg, ${raceColor}88, ${raceColor})`,
              boxShadow: `0 0 6px ${raceGlow}`,
            }}
          />
          {/* Animated shimmer */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)',
              animation: 'shimmer-slide 1.8s ease-in-out infinite',
              transform: 'translateX(-100%)',
            }}
            aria-hidden
          />
        </>
      ) : (
        <div
          className="absolute inset-y-0 left-0 w-0 rounded-full"
          style={{ background: 'rgba(255,255,255,0.10)' }}
        />
      )}
    </div>
  );
}

export function UnitProductionQueue({ queue = DEMO_QUEUE }: UnitProductionQueueProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [localQueue, setLocalQueue] = useState(queue);
  const { raceColor, raceGlow, raceDim } = useRaceTheme();
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Live countdown for the first (active) item */
  useEffect(() => {
    tickRef.current = setInterval(() => {
      setLocalQueue(prev =>
        prev.map((item, idx) =>
          idx === 0 && item.remainingTimeSeconds > 0
            ? { ...item, remainingTimeSeconds: item.remainingTimeSeconds - 1 }
            : item,
        ),
      );
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const activeItem = localQueue[0];
  const hasActive = activeItem && activeItem.remainingTimeSeconds < activeItem.totalTimeSeconds;

  if (localQueue.length === 0) return null;

  return (
    <div
      className="fixed bottom-20 left-3 z-40"
      style={{
        width: collapsed ? '56px' : '264px',
        transition: 'width 0.4s cubic-bezier(0.32,0.72,0,1)',
      }}
    >
      {/* Outer shell — double bezel */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(8,10,16,0.92)',
          border: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        {/* Header / toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-white/[0.03]
                     transition-colors duration-200 focus:outline-none"
          aria-expanded={!collapsed}
          aria-label="Birim üretim kuyruğunu aç/kapat"
        >
          {/* Factory icon — inner core of double-bezel */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0
                       transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
            style={{
              background: raceDim,
              border: `1px solid ${raceColor}30`,
              boxShadow: hasActive ? `0 0 10px ${raceGlow}` : 'none',
            }}
          >
            🏭
          </div>

          {!collapsed && (
            <>
              <div className="flex-1 text-left min-w-0 overflow-hidden">
                <div className="font-display text-[9px] uppercase tracking-[0.18em] text-text-muted">
                  Üretim Kuyruğu
                </div>
                <div
                  className="font-display text-[11px] font-bold truncate"
                  style={{ color: raceColor }}
                >
                  {localQueue.length} birim sırada
                </div>
              </div>

              {/* Active pulse */}
              {hasActive && (
                <div
                  className="shrink-0 w-2 h-2 rounded-full animate-pulse"
                  style={{ background: raceColor, boxShadow: `0 0 6px ${raceGlow}` }}
                  aria-hidden
                />
              )}

              {/* Chevron */}
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                className="shrink-0 transition-transform duration-300"
                style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
                aria-hidden
              >
                <path
                  d="M2 4.5 L6 8.5 L10 4.5"
                  stroke="rgba(255,255,255,0.28)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </>
          )}
        </button>

        {/* Queue list */}
        {!collapsed && (
          <div
            className="border-t"
            style={{ borderColor: 'rgba(255,255,255,0.05)' }}
          >
            {localQueue.map((item, idx) => {
              const isActive = idx === 0 && item.remainingTimeSeconds < item.totalTimeSeconds;

              return (
                <div
                  key={item.id}
                  className={clsx(
                    'flex items-center gap-2.5 px-3 py-2.5',
                    idx < localQueue.length - 1 && 'border-b',
                    isActive && 'bg-white/[0.02]',
                  )}
                  style={
                    idx < localQueue.length - 1
                      ? { borderColor: 'rgba(255,255,255,0.04)' }
                      : undefined
                  }
                >
                  {/* Unit avatar */}
                  <div
                    className="relative w-9 h-9 rounded-xl flex items-center justify-center
                               text-base shrink-0 transition-all duration-300"
                    style={{
                      background: isActive ? raceDim : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${isActive ? raceColor + '45' : 'rgba(255,255,255,0.06)'}`,
                      boxShadow: isActive ? `0 0 12px ${raceGlow}` : 'none',
                    }}
                  >
                    <span aria-hidden>{item.unitEmoji}</span>

                    {/* Queue position badge */}
                    <span
                      className="absolute -top-1.5 -right-1.5 w-[18px] h-[18px] rounded-full
                                 flex items-center justify-center font-display font-black text-[8px] leading-none"
                      style={{
                        background: isActive ? raceColor : 'rgba(255,255,255,0.12)',
                        color: isActive ? '#080a10' : 'rgba(255,255,255,0.5)',
                        boxShadow: isActive ? `0 0 6px ${raceGlow}` : 'none',
                      }}
                    >
                      {item.queuePosition}
                    </span>
                  </div>

                  {/* Info block */}
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="font-display text-[10px] font-bold truncate"
                        style={{ color: isActive ? raceColor : 'rgba(255,255,255,0.65)' }}
                      >
                        {item.unitType}
                      </span>
                      <span
                        className="shrink-0 px-[5px] py-px rounded font-display text-[8px] font-bold"
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          color: 'rgba(255,255,255,0.35)',
                        }}
                      >
                        Lv.{item.level}
                      </span>
                    </div>

                    <TimerBar
                      total={item.totalTimeSeconds}
                      remaining={item.remainingTimeSeconds}
                      raceColor={raceColor}
                      raceGlow={raceGlow}
                      isActive={isActive}
                    />
                  </div>

                  {/* Countdown */}
                  <div
                    className="shrink-0 font-display tabular-nums text-[9px] font-bold min-w-[28px] text-right"
                    style={{ color: isActive ? raceColor : 'rgba(255,255,255,0.25)' }}
                  >
                    {isActive ? formatTime(item.remainingTimeSeconds) : '—'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
