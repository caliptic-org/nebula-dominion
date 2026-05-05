'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { SolarSystem, Fleet, TradeLine, DiscoveryState, ZoomLevel } from './types';
import { ZOOM_THRESHOLDS } from './types';
import { MapController } from './MapController';
import { FogOfWarLayer } from './FogOfWarLayer';
import { TerritoryLayer } from './TerritoryLayer';
import { ConnectionLayer } from './ConnectionLayer';
import { SystemNodesLayer } from './SystemNodesLayer';
import { FleetLayer } from './FleetLayer';
import './galaxy-map.css';

interface GalaxyMapProps {
  systems: SolarSystem[];
  fleets: Fleet[];
  connections: TradeLine[];
  discovery: DiscoveryState;
  /** World canvas dimensions — drives layer sizing. */
  worldWidth?: number;
  worldHeight?: number;
  /** Selected system id (controlled). */
  selectedId?: string | null;
  onSelectSystem?: (id: string | null) => void;
}

export function GalaxyMap({
  systems,
  fleets,
  connections,
  discovery,
  worldWidth = 4000,
  worldHeight = 2400,
  selectedId: controlledSelectedId,
  onSelectSystem,
}: GalaxyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<MapController | null>(null);
  const [scale, setScale] = useState(0.3);
  const [level, setLevel] = useState<ZoomLevel>('galaxy');
  const [internalSelected, setInternalSelected] = useState<string | null>(null);

  const selectedId = controlledSelectedId ?? internalSelected;
  const setSelected = useCallback(
    (id: string | null) => {
      if (onSelectSystem) onSelectSystem(id);
      else setInternalSelected(id);
    },
    [onSelectSystem],
  );

  useEffect(() => {
    const container = containerRef.current;
    const layer = layerRef.current;
    if (!container || !layer) return;
    const controller = new MapController();
    controllerRef.current = controller;
    controller.attach(container, layer);
    const off = controller.onChange(({ scale, level }) => {
      setScale(scale);
      setLevel(level);
    });
    return () => {
      off();
      controller.detach();
      controllerRef.current = null;
    };
  }, []);

  const handleZoomIn = () => controllerRef.current?.zoomBy(1.4);
  const handleZoomOut = () => controllerRef.current?.zoomBy(1 / 1.4);
  const handleRecenter = () =>
    controllerRef.current?.centerOn(worldWidth / 2, worldHeight / 2, 0.3);

  const fogEnabled = level !== 'base';
  const showConnections = level !== 'galaxy';

  return (
    <div
      ref={containerRef}
      className="galaxy-map"
      data-zoom={level}
    >
      {/* Background — fixed inside the map, doesn't pan with the world layer */}
      <div className="galaxy-bg" aria-hidden />

      {/* World layer — single transformed parent for every world-space child */}
      <div
        ref={layerRef}
        className="galaxy-world-layer"
        style={{ width: worldWidth, height: worldHeight }}
      >
        <TerritoryLayer systems={systems} width={worldWidth} height={worldHeight} />
        {showConnections && (
          <ConnectionLayer
            systems={systems}
            lines={connections}
            width={worldWidth}
            height={worldHeight}
          />
        )}
        <SystemNodesLayer
          systems={systems}
          selectedId={selectedId}
          onSelect={setSelected}
        />
        <FleetLayer fleets={fleets} width={worldWidth} height={worldHeight} />
        <FogOfWarLayer
          systems={systems}
          discovery={discovery}
          width={worldWidth}
          height={worldHeight}
          enabled={fogEnabled}
        />
      </div>

      {/* UI overlay — fixed to the viewport, not the map layer */}
      <div className="galaxy-ui-overlay">
        <div className="galaxy-zoom-controls">
          <button onClick={handleZoomIn} aria-label="Yakınlaştır">+</button>
          <button onClick={handleRecenter} aria-label="Merkeze al">⌖</button>
          <button onClick={handleZoomOut} aria-label="Uzaklaştır">−</button>
        </div>

        <div className="galaxy-zoom-badge" aria-live="polite">
          <span className="galaxy-zoom-level">{ZOOM_THRESHOLDS[level].label}</span>
          <span className="galaxy-zoom-scale">×{scale.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

export type { SolarSystem, Fleet, TradeLine, DiscoveryState };
