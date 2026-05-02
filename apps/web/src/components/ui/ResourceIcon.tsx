interface ResourceIconProps {
  type: 'mineral' | 'gas' | 'energy';
  size?: number;
  className?: string;
}

export function ResourceIcon({ type, size = 18, className = '' }: ResourceIconProps) {
  if (type === 'mineral') {
    return (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
        <polygon
          points="10,2 18,7 18,13 10,18 2,13 2,7"
          fill="none"
          stroke="var(--color-mineral)"
          strokeWidth="1.5"
        />
        <polygon
          points="10,5 15,8 15,12 10,15 5,12 5,8"
          fill="var(--color-mineral)"
          opacity="0.5"
        />
        <line x1="10" y1="2" x2="10" y2="18" stroke="var(--color-mineral)" strokeWidth="0.8" opacity="0.6" />
        <line x1="2" y1="7" x2="18" y2="13" stroke="var(--color-mineral)" strokeWidth="0.8" opacity="0.6" />
        <line x1="18" y1="7" x2="2" y2="13" stroke="var(--color-mineral)" strokeWidth="0.8" opacity="0.6" />
      </svg>
    );
  }

  if (type === 'gas') {
    return (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
        <path
          d="M10 2 C10 2, 14 6, 14 10 C14 14, 10 17, 10 18 C10 17, 6 14, 6 10 C6 6, 10 2, 10 2Z"
          fill="var(--color-gas)"
          opacity="0.6"
        />
        <path
          d="M10 5 C10 5, 12.5 8, 12.5 10.5 C12.5 13, 10 15, 10 15 C10 15, 7.5 13, 7.5 10.5 C7.5 8, 10 5, 10 5Z"
          fill="none"
          stroke="var(--color-gas)"
          strokeWidth="1.2"
        />
        <circle cx="10" cy="10" r="1.8" fill="var(--color-gas)" />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <path
        d="M11 2L4 11H9L8 18L16 9H11L11 2Z"
        fill="var(--color-energy)"
        opacity="0.8"
      />
      <path
        d="M11 2L4 11H9L8 18L16 9H11L11 2Z"
        fill="none"
        stroke="var(--color-energy)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}
