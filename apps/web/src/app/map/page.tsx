'use client';

import { useRef, useState, useCallback, useEffect, type ComponentType } from 'react';
import { useRaceTheme } from '@/hooks/useRaceTheme';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { fetcher, FetchError } from '@/lib/fetcher';
import useSWR, { mutate } from 'swr';
import dynamic from 'next/dynamic';
import type {
  WorldMapHandle,
  HitTarget,
  WorldMapProps,
  WorldBase,
  WorldResource,
  WorldEnemy,
  TerritoryZone,
} from '@/components/game/WorldMap';
import clsx from 'clsx';

// Canvas cannot SSR — cast preserves forwardRef generic so `ref` prop typechecks
const WorldMap = dynamic(
  () => import('@/components/game/WorldMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center" style={{ background:'#080a10' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor:'var(--color-race)', borderTopColor:'transparent' }} />
          <span className="font-display text-[10px] uppercase tracking-[0.2em] text-text-muted">Galaksi Yükleniyor…</span>
        </div>
      </div>
    ),
  }
) as ComponentType<WorldMapProps & React.RefAttributes<WorldMapHandle>>;

// ── API response types ─────────────────────────────────────────────────────
interface MapStateResponse {
  bases: WorldBase[];
  resources: WorldResource[];
  enemies: WorldEnemy[];
  territories: TerritoryZone[];
}

interface PlayerResource {
  kind: 'mineral' | 'gas' | 'energy' | 'population';
  amount: number;
  capacity?: number;
}

type PlayerResourcesResponse = PlayerResource[] | { resources: PlayerResource[] };

// ── Resource display ───────────────────────────────────────────────────────
interface ResourceView { icon: string; label: string; value: string | number; color: string }

const RESOURCE_FALLBACK: readonly ResourceView[] = [
  { icon:'💎', label:'Mineral', value:2400,    color:'#4a9eff' },
  { icon:'⚗️', label:'Gaz',    value:840,     color:'#44ff88' },
  { icon:'⚡', label:'Enerji', value:1200,    color:'#ffc832' },
  { icon:'👥', label:'Nüfus',  value:'12/50', color:'#cc00ff' },
];

const RESOURCE_META: Record<PlayerResource['kind'], { icon: string; label: string; color: string }> = {
  mineral:    { icon:'💎', label:'Mineral', color:'#4a9eff' },
  gas:        { icon:'⚗️', label:'Gaz',    color:'#44ff88' },
  energy:     { icon:'⚡', label:'Enerji', color:'#ffc832' },
  population: { icon:'👥', label:'Nüfus',  color:'#cc00ff' },
};

function toResourceView(list: PlayerResource[]): ResourceView[] {
  return list.map(r => {
    const meta = RESOURCE_META[r.kind];
    const value = r.kind === 'population' && r.capacity != null
      ? `${r.amount}/${r.capacity}`
      : r.amount;
    return { icon: meta.icon, label: meta.label, color: meta.color, value };
  });
}

// ── Action definitions ─────────────────────────────────────────────────────
interface Action { id:string; label:string; icon:string; color:string; hotkey:string }

const ACTS_OWN:    Action[] = [
  { id:'rally',   label:'Rally',    icon:'📡', color:'#4a9eff', hotkey:'R' },
  { id:'defend',  label:'Savun',    icon:'🛡', color:'#44ff88', hotkey:'D' },
  { id:'upgrade', label:'Geliştir', icon:'⬆', color:'#ffc832', hotkey:'U' },
];
const ACTS_ENEMY_BASE: Action[] = [
  { id:'attack', label:'Saldır',  icon:'⚔️', color:'#ff3355', hotkey:'A' },
  { id:'scout',  label:'Keşfet',  icon:'🔭', color:'#00cfff', hotkey:'S' },
  { id:'rally',  label:'Rally',   icon:'📡', color:'#4a9eff', hotkey:'R' },
];
const ACTS_RESOURCE: Action[] = [
  { id:'gather', label:'Topla',  icon:'⛏', color:'#ffc832', hotkey:'G' },
  { id:'scout',  label:'Keşfet', icon:'🔭', color:'#00cfff', hotkey:'S' },
];
const ACTS_ENEMY: Action[] = [
  { id:'attack', label:'Saldır', icon:'⚔️', color:'#ff3355', hotkey:'A' },
  { id:'flee',   label:'Kaç',    icon:'💨', color:'#888',    hotkey:'F' },
];

// ── Territory legend ───────────────────────────────────────────────────────
const LEGEND = [
  { label:'Zerg',    color:'#44ff44' },
  { label:'Otomat',  color:'#00cfff' },
  { label:'Canavar', color:'#ff6600' },
  { label:'Şeytan',  color:'#cc00ff' },
] as const;

// ── Endpoints ──────────────────────────────────────────────────────────────
const MAP_STATE_URL        = '/api/map/state';
const PLAYER_RESOURCES_URL = '/api/player/resources';
const MAP_ACTION_URL       = '/api/map/action';

// ── Minimap subcomponent ───────────────────────────────────────────────────
function MinimapPanel({ worldMapRef }: { worldMapRef: React.RefObject<WorldMapHandle | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Poll minimap at ~10fps
  useEffect(() => {
    const id = setInterval(() => {
      const canvas = canvasRef.current;
      if (!canvas || !worldMapRef.current) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      worldMapRef.current.drawMinimap(ctx, canvas.width, canvas.height);
    }, 100);
    return () => clearInterval(id);
  }, [worldMapRef]);

  return (
    <div className="doppelrand" style={{ width:180 }}>
      <div className="doppelrand-inner overflow-hidden" style={{ borderRadius:'calc(1.25rem - 2px)' }}>
        <div
          className="flex items-center justify-between px-2.5 pt-1.5 pb-1"
          style={{ background:'rgba(8,10,16,0.9)', borderBottom:'1px solid rgba(255,255,255,0.06)' }}
        >
          <span className="font-display text-[9px] uppercase tracking-[0.18em] text-text-muted">Mini Harita</span>
          <span className="font-display text-[8px] text-text-muted opacity-50">Sektör-7</span>
        </div>
        <canvas
          ref={canvasRef}
          width={176}
          height={110}
          className="block"
          style={{ imageRendering:'pixelated' }}
        />
      </div>
    </div>
  );
}

// ── Action panel ───────────────────────────────────────────────────────────
interface ActionPanelProps {
  visible: boolean;
  target: HitTarget | null;
  actions: Action[];
  raceColor: string;
  onAction: (a: Action) => void;
  onClose: () => void;
  pendingActionId: string | null;
}

function ActionPanel({ visible, target, actions, raceColor, onAction, onClose, pendingActionId }: ActionPanelProps) {
  const selLabel = () => {
    if (!target) return null;
    if (target.kind==='base'&&target.base) {
      const c = target.base.isPlayer ? raceColor : '#ff8888';
      return { name:target.base.name, sub:`Güç: ${target.base.power.toLocaleString('tr-TR')} • Lv.${target.base.level}`, color:c };
    }
    if (target.kind==='resource'&&target.resource) {
      const names={mineral:'Mineral Yatağı',gas:'Gaz Rezervi',energy:'Enerji Nodu'};
      const cols={mineral:'#4a9eff',gas:'#44ff88',energy:'#ffc832'};
      return { name:names[target.resource.kind], sub:`Miktar: ${target.resource.amount.toLocaleString('tr-TR')} birim`, color:cols[target.resource.kind] };
    }
    if (target.kind==='enemy'&&target.enemy) {
      return { name:'Düşman Birliği', sub:`Güç: ${target.enemy.power} • ${target.enemy.race}`, color:'#ff3355' };
    }
    return null;
  };
  const info = selLabel();

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-40"
      style={{
        transform:visible?'translateY(0)':'translateY(110%)',
        transition:'transform 500ms cubic-bezier(0.32,0.72,0,1)',
      }}
    >
      <div
        className="mx-3 mb-3 relative overflow-hidden"
        style={{
          background:'rgba(10,14,22,0.97)',
          border:'1px solid rgba(255,255,255,0.08)',
          borderRadius:'1.25rem',
          backdropFilter:'blur(24px)',
          boxShadow:`0 -8px 40px rgba(0,0,0,0.65), 0 0 0 1px rgba(0,0,0,0.4), 0 0 32px ${raceColor}18`,
        }}
      >
        {/* Corner accents — manga style */}
        {(['tl','tr'] as const).map(corner => (
          <div
            key={corner}
            className="absolute top-0 w-8 h-8 pointer-events-none"
            style={{ [corner==='tl'?'left':'right']:0, transform:corner==='tr'?'scaleX(-1)':undefined }}
            aria-hidden
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M0 0 L16 0" stroke="rgba(255,255,255,0.18)" strokeWidth="2"/>
              <path d="M0 0 L0 16" stroke="rgba(255,255,255,0.18)" strokeWidth="2"/>
            </svg>
          </div>
        ))}

        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}
        >
          <div>
            {info ? (
              <>
                <div className="font-display text-sm font-black tracking-wide" style={{ color:info.color, textShadow:`0 0 10px ${info.color}50` }}>{info.name}</div>
                <div className="font-body text-[11px] text-text-muted mt-0.5">{info.sub}</div>
              </>
            ) : (
              <div className="font-display text-sm font-black text-text-muted tracking-wide">Konum Seçildi</div>
            )}
          </div>
          {target && (
            <span className="font-display text-[9px] uppercase tracking-widest text-text-muted px-2 py-0.5 rounded-full" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
              [{target.col},{target.row}]
            </span>
          )}
          <button
            onClick={onClose}
            className="ml-2 w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all duration-200"
            style={{ border:'1px solid rgba(255,255,255,0.10)', color:'var(--color-text-muted)' }}
            aria-label="Kapat"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Actions */}
        <div className="px-4 py-3.5 flex flex-wrap gap-2">
          {actions.map(action => {
            const isPending = pendingActionId === action.id;
            return (
              <button
                key={action.id}
                onClick={()=>onAction(action)}
                disabled={pendingActionId !== null}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-full font-display text-[11px] font-bold tracking-[0.08em] uppercase active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background:`${action.color}14`,
                  border:`1px solid ${action.color}35`,
                  color:action.color,
                  transition:'all 0.28s cubic-bezier(0.32,0.72,0,1)',
                }}
                aria-busy={isPending}
                onMouseEnter={e=>{
                  if (pendingActionId !== null) return;
                  const b=e.currentTarget;
                  b.style.background=`${action.color}28`;
                  b.style.boxShadow=`0 0 18px ${action.color}35`;
                  b.style.transform='translateY(-1px)';
                }}
                onMouseLeave={e=>{
                  const b=e.currentTarget;
                  b.style.background=`${action.color}14`;
                  b.style.boxShadow='';
                  b.style.transform='';
                }}
              >
                <span className="text-base leading-none" aria-hidden>
                  {isPending ? (
                    <span
                      className="inline-block w-3 h-3 rounded-full border-2 animate-spin align-middle"
                      style={{ borderColor: action.color, borderTopColor: 'transparent' }}
                    />
                  ) : action.icon}
                </span>
                <span>{action.label}</span>
                {/* Button-in-button hotkey badge */}
                <span
                  className="flex items-center justify-center w-5 h-5 rounded-full text-[8px] font-bold"
                  style={{ background:`${action.color}20`, border:`1px solid ${action.color}30` }}
                  aria-hidden
                >
                  {action.hotkey}
                </span>
              </button>
            );
          })}
        </div>

        {/* Race glow strip */}
        <div className="h-px" style={{ background:`linear-gradient(90deg, transparent, ${raceColor}40, transparent)` }} />
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function WorldMapPage() {
  const { race, raceColor, raceGlow } = useRaceTheme();
  const worldMapRef = useRef<WorldMapHandle>(null);
  const [selected,        setSelected]        = useState<HitTarget|null>(null);
  const [panelVisible,    setPanelVisible]    = useState(false);
  const [feedback,        setFeedback]        = useState<{ tone: 'info' | 'error'; text: string }|null>(null);
  const [pendingActionId, setPendingActionId] = useState<string|null>(null);
  const [actionError,     setActionError]     = useState<unknown>(null);

  // ── Server state ─────────────────────────────────────────────────────────
  const {
    data: mapState,
    error: mapStateError,
  } = useSWR<MapStateResponse>(MAP_STATE_URL, fetcher, { refreshInterval: 5000 });

  const {
    data: playerResources,
    error: playerResourcesError,
  } = useSWR<PlayerResourcesResponse>(PLAYER_RESOURCES_URL, fetcher, { refreshInterval: 3000 });

  // Auth guard — redirect to /login if any request returns 401
  useAuthGuard(mapStateError);
  useAuthGuard(playerResourcesError);
  useAuthGuard(actionError);

  // Show a non-401 fetch error as a toast (auth errors are handled by the guard)
  useEffect(() => {
    const err = mapStateError ?? playerResourcesError;
    if (!err) return;
    if (err instanceof FetchError && err.status === 401) return;
    const text = err instanceof Error ? err.message : 'Bağlantı hatası';
    setFeedback({ tone: 'error', text: `⚠ ${text}` });
  }, [mapStateError, playerResourcesError]);

  const resourceView: readonly ResourceView[] = (() => {
    if (!playerResources) return RESOURCE_FALLBACK;
    const list = Array.isArray(playerResources) ? playerResources : playerResources.resources;
    return list?.length ? toResourceView(list) : RESOURCE_FALLBACK;
  })();

  const handleSelect = useCallback((t: HitTarget|null) => {
    setSelected(t);
    setPanelVisible(!!t && t.kind !== 'empty');
  }, []);

  const handleAction = useCallback(async (action: Action) => {
    if (!selected) return;
    setPendingActionId(action.id);
    try {
      await fetcher(MAP_ACTION_URL, {
        method: 'POST',
        body: JSON.stringify({
          action:    action.id,
          targetCol: selected.col,
          targetRow: selected.row,
        }),
      });
      setFeedback({ tone: 'info', text: `${action.icon} ${action.label} komutu verildi` });
      // Refresh resources & map state — server state may have changed.
      mutate(PLAYER_RESOURCES_URL);
      mutate(MAP_STATE_URL);
      setPanelVisible(false);
      setSelected(null);
    } catch (err) {
      // Route 401s through the shared auth guard; other errors surface as a toast.
      if (err instanceof FetchError && err.status === 401) {
        setActionError(err);
        return;
      }
      const text = err instanceof Error ? err.message : 'Ağ hatası';
      setFeedback({ tone: 'error', text: `⚠ ${text}` });
    } finally {
      setPendingActionId(null);
    }
  }, [selected]);

  // Auto-dismiss feedback toast
  useEffect(() => {
    if (!feedback) return;
    const timeout = feedback.tone === 'error' ? 3500 : 2200;
    const id = setTimeout(() => setFeedback(null), timeout);
    return () => clearTimeout(id);
  }, [feedback]);

  const actions: Action[] = (() => {
    if (!selected) return [];
    if (selected.kind==='base') return selected.base?.isPlayer ? ACTS_OWN : ACTS_ENEMY_BASE;
    if (selected.kind==='resource') return ACTS_RESOURCE;
    if (selected.kind==='enemy')    return ACTS_ENEMY;
    return [];
  })();

  const toastBorder = feedback?.tone === 'error' ? 'rgba(255,80,80,0.55)' : `${raceColor}45`;
  const toastColor  = feedback?.tone === 'error' ? '#ff8a8a' : raceColor;

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background:'#080a10' }}>

      {/* ── Full-screen world map ──────────────────────────────────────────── */}
      <div className="absolute inset-0">
        <WorldMap
          ref={worldMapRef}
          playerRace={race}
          onSelect={handleSelect}
          bases={mapState?.bases}
          resources={mapState?.resources}
          enemies={mapState?.enemies}
          territories={mapState?.territories}
        />
      </div>

      {/* ── Scan-line filter ──────────────────────────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{ backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.04) 3px,rgba(0,0,0,0.04) 4px)' }}
        aria-hidden
      />

      {/* ── Vignette ─────────────────────────────────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{ background:'radial-gradient(ellipse 90% 85% at 50% 50%,transparent 45%,rgba(4,6,10,0.75) 100%)' }}
        aria-hidden
      />

      {/* ── Race nebula tint ──────────────────────────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-0 z-10 transition-all duration-700"
        style={{ background:`radial-gradient(ellipse 70% 50% at 50% 0%,${raceColor}0a 0%,transparent 70%)` }}
        aria-hidden
      />

      {/* ── Top HUD ──────────────────────────────────────────────────────── */}
      <header
        className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between gap-2 px-3 py-2"
        style={{
          background:'rgba(8,10,16,0.88)',
          borderBottom:'1px solid rgba(255,255,255,0.06)',
          backdropFilter:'blur(20px)',
        }}
      >
        {/* Back + title */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="/"
            className="flex items-center justify-center w-8 h-8 rounded-full hover:scale-110 active:scale-95 transition-all duration-300"
            style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.10)' }}
            aria-label="Geri"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
          <div className="hidden xs:block">
            <div className="font-display text-[10px] font-black tracking-[0.18em] uppercase" style={{ color:raceColor, textShadow:`0 0 12px ${raceGlow}` }}>◆ NEBULA</div>
            <div className="font-display text-[8px] tracking-widest text-text-muted uppercase leading-none">Galaksi Haritası</div>
          </div>
        </div>

        {/* Resources */}
        <div className="flex items-center gap-1 flex-wrap justify-center min-w-0">
          {resourceView.map(r=>(
            <div key={r.label} className="resource-bar shrink-0" title={r.label}>
              <span aria-hidden>{r.icon}</span>
              <span style={{ color:r.color }}>{typeof r.value==='number'?r.value.toLocaleString('tr-TR'):r.value}</span>
            </div>
          ))}
        </div>

        {/* Hint */}
        <div className="shrink-0 hidden lg:block">
          <span className="font-display text-[8px] tracking-widest text-text-muted uppercase px-2 py-1 rounded" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
            Sürükle / Zum
          </span>
        </div>
      </header>

      {/* ── Territory legend (bottom-left) ───────────────────────────────── */}
      <div className="absolute bottom-20 left-3 z-30 flex flex-col gap-1.5 pointer-events-none">
        {LEGEND.map(l=>(
          <div key={l.label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background:`${l.color}12`, border:`1px solid ${l.color}35` }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background:l.color, boxShadow:`0 0 5px ${l.color}` }} />
            <span className="font-display text-[9px] uppercase tracking-widest" style={{ color:l.color }}>{l.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background:'rgba(255,50,50,0.10)', border:'1px solid rgba(255,50,50,0.30)' }}>
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background:'#ff3333', boxShadow:'0 0 5px #ff3333' }} />
          <span className="font-display text-[9px] uppercase tracking-widest text-red-400">Düşman</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background:'rgba(255,200,50,0.10)', border:'1px solid rgba(255,200,50,0.30)' }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background:'#ffc832', boxShadow:'0 0 4px #ffc832' }} />
          <span className="font-display text-[9px] uppercase tracking-widest text-yellow-400">Kaynak</span>
        </div>
      </div>

      {/* ── Mini-map (bottom-right) ───────────────────────────────────────── */}
      <div className="absolute bottom-20 right-3 z-30">
        <MinimapPanel worldMapRef={worldMapRef} />
      </div>

      {/* ── Feedback toast ────────────────────────────────────────────────── */}
      {feedback && (
        <div
          role={feedback.tone === 'error' ? 'alert' : 'status'}
          className="absolute top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-manga-appear"
          style={{ background:'rgba(13,17,23,0.94)', border:`1px solid ${toastBorder}`, borderRadius:'9999px', padding:'0.375rem 1.25rem', backdropFilter:'blur(12px)' }}
        >
          <span className="font-display text-[11px] tracking-wide" style={{ color:toastColor }}>{feedback.text}</span>
        </div>
      )}

      {/* ── Selection action panel ─────────────────────────────────────────── */}
      <ActionPanel
        visible={panelVisible}
        target={selected}
        actions={actions}
        raceColor={raceColor}
        onAction={handleAction}
        onClose={()=>{ setPanelVisible(false); setSelected(null); }}
        pendingActionId={pendingActionId}
      />

      {/* ── Bottom nav ────────────────────────────────────────────────────── */}
      <nav
        className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-around px-2 py-3"
        style={{ background:'rgba(8,10,16,0.96)', borderTop:'1px solid rgba(255,255,255,0.07)', backdropFilter:'blur(24px)' }}
      >
        {([
          { href:'/',           icon:'🏰', label:'Ana Üs'    },
          { href:'/map',        icon:'🌌', label:'Harita', active:true },
          { href:'/battle',     icon:'⚔️', label:'Savaş'     },
          { href:'/commanders', icon:'🤝', label:'Komutanlar' },
          { href:'/dashboard',  icon:'💎', label:'Mağaza'    },
        ] as const).map(tab=>(
          <a
            key={tab.href}
            href={tab.href}
            className={clsx('bottom-nav-item transition-all duration-300', 'active' in tab && tab.active && 'active')}
            aria-current={'active' in tab && tab.active ? 'page' : undefined}
          >
            <span className="text-lg leading-none" aria-hidden>{tab.icon}</span>
            <span className="font-display text-[9px] uppercase tracking-wide">{tab.label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
