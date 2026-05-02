'use client';

import { useEffect, useState } from 'react';

interface TimeLeft {
  d: number;
  h: number;
  m: number;
  s: number;
}

function useCountdown(targetDate: Date): TimeLeft {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, targetDate.getTime() - Date.now());
      setTimeLeft({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return timeLeft;
}

interface CountdownTimerProps {
  targetDate: Date;
  raceColor?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP = {
  sm: { digit: 'text-xl',  label: 'text-[9px]',  gap: 'gap-2', pad: 'px-2.5 py-1.5' },
  md: { digit: 'text-3xl', label: 'text-[10px]', gap: 'gap-3', pad: 'px-4 py-2.5'   },
  lg: { digit: 'text-5xl', label: 'text-xs',     gap: 'gap-4', pad: 'px-5 py-4'     },
};

export function CountdownTimer({
  targetDate,
  raceColor = '#7b8cde',
  size = 'md',
}: CountdownTimerProps) {
  const { d, h, m, s } = useCountdown(targetDate);
  const sz = SIZE_MAP[size];

  const units = [
    { value: d, label: 'GÜN' },
    { value: h, label: 'SAAT' },
    { value: m, label: 'DAK' },
    { value: s, label: 'SN' },
  ];

  return (
    <div className={`flex items-center ${sz.gap}`} role="timer" aria-label="Kalan süre">
      {units.map(({ value, label }, i) => (
        <div key={label} className="flex items-center" style={{ gap: 'inherit' }}>
          {i > 0 && (
            <span
              className="font-display font-black animate-pulse select-none"
              style={{
                color: raceColor,
                fontSize: size === 'lg' ? '1.75rem' : '1rem',
                lineHeight: 1,
                margin: size === 'lg' ? '0 4px' : '0 2px',
                textShadow: `0 0 12px ${raceColor}`,
              }}
              aria-hidden
            >
              :
            </span>
          )}

          <div className="flex flex-col items-center">
            {/* Double-bezel digit cell */}
            <div
              className={`relative rounded-lg overflow-hidden shrink-0 ${sz.pad}`}
              style={{
                background: 'rgba(0,0,0,0.65)',
                border: `1px solid ${raceColor}30`,
                boxShadow: `0 0 18px ${raceColor}18, inset 0 1px 0 ${raceColor}20`,
              }}
            >
              {/* Manga scan-line overlay */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `repeating-linear-gradient(0deg, transparent, transparent 3px, ${raceColor}06 3px, ${raceColor}06 4px)`,
                }}
                aria-hidden
              />
              {/* Digit */}
              <span
                className={`relative font-display font-black ${sz.digit} leading-none tabular-nums block`}
                style={{
                  color: raceColor,
                  textShadow: `0 0 24px ${raceColor}aa, 0 0 4px ${raceColor}`,
                }}
              >
                {String(value).padStart(2, '0')}
              </span>
            </div>

            {/* Label */}
            <span
              className={`mt-1 ${sz.label} font-bold tracking-widest uppercase block text-center`}
              style={{ color: `${raceColor}70` }}
            >
              {label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
