'use client';

import { useEffect, useRef } from 'react';
import type { SolarSystem, DiscoveryState } from './types';

interface FogOfWarLayerProps {
  systems: SolarSystem[];
  discovery: DiscoveryState;
  /** World bounds — canvas uses this size, then scales with the map layer transform. */
  width: number;
  height: number;
  /** Hide entirely once we drop into base zoom (per spec table). */
  enabled: boolean;
}

/**
 * 3-pass canvas fog (per BRIEF):
 *   1) fill with solid dark
 *   2) destination-out radial gradient at every explored system (semi-clear)
 *   3) destination-out radial gradient at every visible system (fully clear)
 *
 * Drawn at world-coord size and scaled with the rest of the map layer —
 * we don't follow the camera here, we live in the same transform space.
 */
export function FogOfWarLayer({ systems, discovery, width, height, enabled }: FogOfWarLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // 1. Solid fog over everything
    ctx.fillStyle = 'rgba(4, 8, 16, 0.92)';
    ctx.fillRect(0, 0, width, height);

    // 2. Cut soft holes for every explored system (memory layer)
    ctx.globalCompositeOperation = 'destination-out';
    for (const sysId of discovery.explored) {
      const sys = systems.find((s) => s.id === sysId);
      if (!sys) continue;
      const grad = ctx.createRadialGradient(
        sys.position.x, sys.position.y, 0,
        sys.position.x, sys.position.y, 120,
      );
      grad.addColorStop(0,   'rgba(0,0,0,0.55)');
      grad.addColorStop(0.6, 'rgba(0,0,0,0.30)');
      grad.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(sys.position.x, sys.position.y, 120, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Cut bright holes for currently-visible systems (active vision)
    for (const sysId of discovery.visible) {
      const sys = systems.find((s) => s.id === sysId);
      if (!sys) continue;
      const grad = ctx.createRadialGradient(
        sys.position.x, sys.position.y, 0,
        sys.position.x, sys.position.y, 160,
      );
      grad.addColorStop(0,   'rgba(0,0,0,1)');
      grad.addColorStop(0.7, 'rgba(0,0,0,0.8)');
      grad.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(sys.position.x, sys.position.y, 160, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
  }, [systems, discovery, width, height, enabled]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="galaxy-fog-canvas"
      width={width}
      height={height}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width,
        height,
        pointerEvents: 'none',
      }}
      aria-hidden
    />
  );
}
