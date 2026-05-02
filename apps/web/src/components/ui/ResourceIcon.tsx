import type { SVGProps } from 'react';

type ResourceType = 'mineral' | 'gas' | 'energy';

interface ResourceIconProps extends SVGProps<SVGSVGElement> {
  type: ResourceType;
  size?: number;
}

function MineralIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <polygon
        points="10,1 14.5,5.5 14.5,14.5 10,19 5.5,14.5 5.5,5.5"
        fill="rgba(74,158,255,0.25)"
        stroke="#4a9eff"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <polygon
        points="10,4 12.5,6.5 12.5,13.5 10,16 7.5,13.5 7.5,6.5"
        fill="rgba(74,158,255,0.5)"
        stroke="#7bb8ff"
        strokeWidth="0.6"
      />
      <line x1="10" y1="1" x2="10" y2="19" stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" />
      <line x1="5.5" y1="5.5" x2="14.5" y2="5.5" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
      <line x1="5.5" y1="14.5" x2="14.5" y2="14.5" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
    </svg>
  );
}

function GasIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M10 18 C6 18 3 15 3 11.5 C3 9 5 7.5 5 6 C5 4.5 4 3.5 4 3.5 C6 4.5 7 6 7 6 C7 4 8.5 2 10 1 C10 1 9 3.5 9 5 C9 6.5 10.5 7.5 11 9 C11.5 10 11 11 11 11 C12.5 10 13 8.5 13 8.5 C14 9.5 17 11 17 13.5 C17 16 13.5 18 10 18 Z"
        fill="rgba(68,217,200,0.3)"
        stroke="#44d9c8"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <path
        d="M10 15.5 C8 15.5 6.5 14 6.5 12.5 C6.5 11.5 7.5 11 7.5 11 C7.5 12 8.5 12.5 9.5 12 C9 11.5 8.5 10.5 9 9.5 C9 9.5 10.5 11 10.5 12 C11 11.5 11.5 11 11.5 11 C12.5 11.5 13.5 12.5 13.5 13.5 C13.5 14.8 12 15.5 10 15.5 Z"
        fill="rgba(68,217,200,0.6)"
        stroke="#66e6d8"
        strokeWidth="0.7"
      />
    </svg>
  );
}

function EnergyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M11.5 1 L4 11 H9.5 L8 19 L16 8 H10.5 Z"
        fill="rgba(255,200,50,0.35)"
        stroke="#ffc832"
        strokeWidth="1.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M11 3.5 L5.5 11 H10 L8.5 16.5 L14.5 9 H10 Z"
        fill="rgba(255,220,100,0.65)"
        stroke="rgba(255,240,150,0.8)"
        strokeWidth="0.5"
      />
    </svg>
  );
}

export function ResourceIcon({ type, size = 20, ...props }: ResourceIconProps) {
  const svgProps: SVGProps<SVGSVGElement> = {
    width: size,
    height: size,
    style: { display: 'block', flexShrink: 0 },
    ...props,
  };

  if (type === 'mineral') return <MineralIcon {...svgProps} />;
  if (type === 'gas')     return <GasIcon {...svgProps} />;
  return <EnergyIcon {...svgProps} />;
}
