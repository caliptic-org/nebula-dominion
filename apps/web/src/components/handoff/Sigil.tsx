import { useId } from 'react';
import { ND, type NDRace } from './nd-tokens';

interface SigilProps {
  race: NDRace;
  size?: number;
  glow?: boolean;
}

export function Sigil({ race, size = 32, glow = false }: SigilProps) {
  const c = race.primary;
  const stroke = race.glow;
  const inner = {
    insan: (
      <g>
        <polygon points="32,6 56,56 8,56" fill="none" stroke={stroke} strokeWidth="2"/>
        <polygon points="32,18 48,48 16,48" fill={c} opacity="0.25"/>
        <line x1="32" y1="6" x2="32" y2="58" stroke={stroke} strokeWidth="1.2"/>
      </g>
    ),
    zerg: (
      <g>
        <circle cx="32" cy="32" r="22" fill="none" stroke={stroke} strokeWidth="2"/>
        <path d="M32 12 L42 32 L32 52 L22 32 Z" fill={c} opacity="0.35"/>
        <circle cx="32" cy="32" r="6" fill={stroke}/>
      </g>
    ),
    otomat: (
      <g>
        <rect x="10" y="10" width="44" height="44" fill="none" stroke={stroke} strokeWidth="2"/>
        <rect x="18" y="18" width="28" height="28" fill={c} opacity="0.30"/>
        <line x1="10" y1="32" x2="54" y2="32" stroke={stroke} strokeWidth="1"/>
        <line x1="32" y1="10" x2="32" y2="54" stroke={stroke} strokeWidth="1"/>
      </g>
    ),
    canavar: (
      <g>
        <polygon points="32,8 56,24 48,56 16,56 8,24" fill="none" stroke={stroke} strokeWidth="2"/>
        <polygon points="32,18 46,28 40,48 24,48 18,28" fill={c} opacity="0.30"/>
        <circle cx="24" cy="34" r="2" fill={stroke}/>
        <circle cx="40" cy="34" r="2" fill={stroke}/>
      </g>
    ),
    seytan: (
      <g>
        <polygon points="32,6 58,32 32,58 6,32" fill="none" stroke={stroke} strokeWidth="2"/>
        <polygon points="32,18 46,32 32,46 18,32" fill={c} opacity="0.35"/>
        <line x1="6" y1="32" x2="58" y2="32" stroke={stroke} strokeWidth="0.8"/>
      </g>
    ),
  }[race.key];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      style={{
        filter: glow ? `drop-shadow(0 0 8px ${race.glow})` : 'none',
        display: 'block',
      }}
      aria-hidden="true"
    >
      {inner}
    </svg>
  );
}

interface NebulaBgProps {
  race: NDRace;
  intensity?: number;
  dim?: number;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  /** Optional landscape backdrop (race+age PNG). When set, the SVG nebula
   *  layers paint on top of it as a tinted overlay instead of hiding it
   *  behind an opaque #06080F fill — that's how the per-age ComfyUI
   *  art at /assets/bases/<race>/age-<n>.png becomes visible on /base. */
  bgImage?: string | null;
}

export function NebulaBg({ race, intensity = 1, dim = 1, className, style, children, bgImage }: NebulaBgProps) {
  const rawId = useId();
  const id = rawId.replace(/:/g, '');
  const hasBg = Boolean(bgImage);
  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        // Without a backdrop image we keep the original opaque deep-space
        // fill so every screen looks identical to the design handoff.
        // When a bgImage is supplied we drop to transparent so the image
        // shows through — the SVG nebula layers still paint over it.
        background: hasBg ? 'transparent' : '#06080F',
        ...style,
      }}
    >
      {bgImage && (
        // Landscape sits beneath the SVG so the race-tinted gradient still
        // paints on top. cover + center matches the previous /base layout
        // exactly; mask fades the bottom 30% so the iso-tilemap's own
        // ground gradient doesn't double up against the photo horizon.
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${bgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.85,
            // Horizon mask: show the ComfyUI landscape only in the top ~45%
            // of the screen, then fade hard to transparent by 60%. /base
            // renders an iso tilemap below this band — the photo acts as
            // a distant sky/skyline above the player's playable ground.
            WebkitMaskImage:
              'linear-gradient(to bottom, black 0%, black 45%, transparent 60%)',
            maskImage:
              'linear-gradient(to bottom, black 0%, black 45%, transparent 60%)',
            pointerEvents: 'none',
          }}
        />
      )}
      <svg
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 400 800"
        style={{ position: 'absolute', inset: 0 }}
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={`neb-${id}-a`} cx="20%" cy="15%" r="60%">
            <stop offset="0%" stopColor={race.primary} stopOpacity={0.35 * intensity * dim} />
            <stop offset="60%" stopColor={race.primaryDim} stopOpacity={0.08 * intensity * dim} />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`neb-${id}-b`} cx="85%" cy="80%" r="55%">
            <stop offset="0%" stopColor={ND.nebulaAccent} stopOpacity={0.30 * intensity * dim} />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`neb-${id}-c`} cx="50%" cy="50%" r="80%">
            <stop offset="0%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.55" />
          </radialGradient>
          <pattern id={`stars-${id}`} width="80" height="80" patternUnits="userSpaceOnUse">
            <circle cx="6"  cy="13" r="0.6"  fill="#fff" opacity="0.7" />
            <circle cx="42" cy="28" r="0.4"  fill="#fff" opacity="0.5" />
            <circle cx="64" cy="52" r="0.7"  fill="#fff" opacity="0.8" />
            <circle cx="22" cy="60" r="0.5"  fill="#fff" opacity="0.6" />
            <circle cx="55" cy="9"  r="0.3"  fill="#fff" opacity="0.4" />
            <circle cx="11" cy="40" r="0.35" fill="#fff" opacity="0.45" />
            <circle cx="74" cy="72" r="0.45" fill="#fff" opacity="0.55" />
          </pattern>
        </defs>
        {/* When bg image is set, skip the opaque base rect so the photo shows. */}
        {!hasBg && <rect width="400" height="800" fill="#03050B" />}
        <rect width="400" height="800" fill={`url(#stars-${id})`} />
        <rect width="400" height="800" fill={`url(#neb-${id}-a)`} />
        <rect width="400" height="800" fill={`url(#neb-${id}-b)`} />
        <rect width="400" height="800" fill={`url(#neb-${id}-c)`} />
      </svg>
      {children}
    </div>
  );
}
