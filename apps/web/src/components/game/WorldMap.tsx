'use client';

import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Race } from '@/types/units';

// ── Constants ──────────────────────────────────────────────────────────────
const TW       = 80;
const TH       = 44;
const COLS     = 26;
const ROWS     = 20;
const ZOOM_MIN = 0.35;
const ZOOM_MAX = 2.6;

type TileKind = 'space' | 'asteroid' | 'planet' | 'nebula' | 'battle' | 'void';

const TILE_PAL: Record<TileKind, { top: string; border: string }> = {
  space:    { top: '#0c1422', border: 'rgba(255,255,255,0.04)' },
  asteroid: { top: '#1c1914', border: 'rgba(255,102,0,0.16)'  },
  planet:   { top: '#0b1c32', border: 'rgba(74,158,255,0.18)' },
  nebula:   { top: '#160c24', border: 'rgba(204,0,255,0.18)'  },
  battle:   { top: '#1e0c0c', border: 'rgba(255,30,55,0.18)'  },
  void:     { top: '#060810', border: 'rgba(255,255,255,0.02)' },
};

const RACE_COL: Record<Race, string> = {
  [Race.INSAN]:   '#4a9eff',
  [Race.ZERG]:    '#44ff44',
  [Race.OTOMAT]:  '#00cfff',
  [Race.CANAVAR]: '#ff6600',
  [Race.SEYTAN]:  '#cc00ff',
};

// ── Public types ───────────────────────────────────────────────────────────
export interface WorldBase {
  id: string;
  col: number;
  row: number;
  race: Race;
  name: string;
  level: number;
  power: number;
  isPlayer?: boolean;
}

export interface WorldResource {
  id: string;
  col: number;
  row: number;
  kind: 'mineral' | 'gas' | 'energy';
  amount: number;
}

export interface WorldEnemy {
  id: string;
  col: number;
  row: number;
  race: Race;
  power: number;
  fcol: number;
  frow: number;
  targetCol: number;
  targetRow: number;
  progress: number;
  patrolPath: Array<[number, number]>;
  pathIdx: number;
}

export type HitKind = 'base' | 'resource' | 'enemy' | 'empty';

export interface HitTarget {
  kind: HitKind;
  col: number;
  row: number;
  screenX: number;
  screenY: number;
  base?: WorldBase;
  resource?: WorldResource;
  enemy?: WorldEnemy;
}

export interface WorldMapHandle {
  drawMinimap: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
}

export interface WorldMapProps {
  playerRace: Race;
  onSelect?: (target: HitTarget | null) => void;
  className?: string;
}

// ── Internal types ─────────────────────────────────────────────────────────
interface TerritoryZone {
  race: Race;
  centerCol: number;
  centerRow: number;
  radius: number;
}

// ── Static world seeding (deterministic) ──────────────────────────────────
function makeBases(playerRace: Race): WorldBase[] {
  return [
    { id:'player',    col:13, row:10, race:playerRace,   name:'Ana Üssün',       level:7, power:4800, isPlayer:true },
    { id:'zerg-1',    col:3,  row:3,  race:Race.ZERG,    name:'Kovan Kalbi',     level:5, power:3200 },
    { id:'otomat-1',  col:22, row:3,  race:Race.OTOMAT,  name:'Prime Hub',       level:6, power:4100 },
    { id:'canavar-1', col:3,  row:17, race:Race.CANAVAR, name:'Ateş Kalesi',     level:4, power:2700 },
    { id:'seytan-1',  col:22, row:16, race:Race.SEYTAN,  name:'Lanet Kulesi',    level:6, power:3900 },
    { id:'insan-1',   col:13, row:3,  race:Race.INSAN,   name:'Kuzey Garnizon',  level:3, power:1800 },
    { id:'neutral-1', col:7,  row:10, race:Race.CANAVAR, name:'Yıkılmış Kale',  level:2, power: 900 },
    { id:'neutral-2', col:19, row:11, race:Race.ZERG,    name:'Kovan Çıkıntısı',level:3, power:1200 },
  ];
}

function makeResources(): WorldResource[] {
  const seed: Array<[number,number,'mineral'|'gas'|'energy']> = [
    [8,5,'mineral'],[16,5,'mineral'],[5,11,'gas'],
    [11,7,'energy'],[17,8,'mineral'],[9,14,'gas'],
    [15,14,'energy'],[20,8,'gas'],[7,7,'mineral'],
    [11,14,'mineral'],[19,6,'energy'],[4,8,'energy'],
    [22,10,'mineral'],[13,16,'gas'],[6,15,'energy'],
    [20,14,'mineral'],[8,17,'gas'],[16,16,'energy'],
  ];
  return seed.map(([col,row,kind],i) => ({ id:`res-${i}`, col, row, kind, amount:500+i*180 }));
}

function makeEnemies(): WorldEnemy[] {
  const patrols: Array<[Race,Array<[number,number]>]> = [
    [Race.ZERG,    [[10,5],[12,6],[11,8],[9,7],[10,5]]],
    [Race.CANAVAR, [[7,12],[10,13],[9,15],[7,14],[7,12]]],
    [Race.SEYTAN,  [[17,5],[19,7],[18,9],[16,8],[17,5]]],
    [Race.OTOMAT,  [[15,11],[17,12],[16,14],[14,13],[15,11]]],
    [Race.ZERG,    [[4,12],[6,11],[5,14],[3,13],[4,12]]],
    [Race.SEYTAN,  [[18,3],[20,4],[21,5],[19,5],[18,3]]],
  ];
  return patrols.map(([race,path],i) => ({
    id:`enemy-${i}`, col:path[0][0], row:path[0][1],
    race, power:300+i*250,
    fcol:path[0][0], frow:path[0][1],
    targetCol:path[1][0], targetRow:path[1][1],
    progress:i*0.18, patrolPath:path, pathIdx:0,
  }));
}

function makeTerritories(): TerritoryZone[] {
  return [
    { race:Race.ZERG,    centerCol:3,  centerRow:3,  radius:5 },
    { race:Race.OTOMAT,  centerCol:22, centerRow:3,  radius:5 },
    { race:Race.CANAVAR, centerCol:3,  centerRow:17, radius:5 },
    { race:Race.SEYTAN,  centerCol:22, centerRow:16, radius:5 },
  ];
}

function generateTiles(): TileKind[][] {
  const kinds: TileKind[] = ['space','space','space','space','asteroid','planet','nebula'];
  let s = 42;
  const rand = () => { s = (s*9301+49297)%233280; return s/233280; };
  return Array.from({length:ROWS}, () =>
    Array.from({length:COLS}, () => rand() < 0.7 ? 'space' : kinds[Math.floor(rand()*kinds.length)])
  );
}

// ── Coordinate helpers ─────────────────────────────────────────────────────
function isoToScreen(col: number, row: number, ox: number, oy: number, z: number) {
  return { x:(col-row)*(TW/2)*z+ox, y:(col+row)*(TH/2)*z+oy };
}
function screenToIso(sx: number, sy: number, ox: number, oy: number, z: number) {
  const rx=(sx-ox)/z, ry=(sy-oy)/z;
  return {
    col:Math.round((rx/(TW/2)+ry/(TH/2))/2),
    row:Math.round((ry/(TH/2)-rx/(TW/2))/2),
  };
}

// ── Component ──────────────────────────────────────────────────────────────
const WorldMap = forwardRef<WorldMapHandle, WorldMapProps>(function WorldMap(
  { playerRace, onSelect, className },
  ref,
) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const tilesRef    = useRef<TileKind[][]>(generateTiles());
  const basesRef    = useRef<WorldBase[]>(makeBases(playerRace));
  const resRef      = useRef<WorldResource[]>(makeResources());
  const enemiesRef  = useRef<WorldEnemy[]>(makeEnemies());
  const zonesRef    = useRef<TerritoryZone[]>(makeTerritories());
  const offsetRef   = useRef({ x:0, y:0 });
  const zoomRef     = useRef(1.0);
  const dragRef     = useRef({ active:false, sx:0, sy:0, ox:0, oy:0 });
  const rafRef      = useRef(0);
  const timeRef     = useRef(0);
  const selRef      = useRef<HitTarget|null>(null);

  const centerOnPlayer = useCallback(() => {
    const c = canvasRef.current; if (!c) return;
    const pb = basesRef.current.find(b=>b.isPlayer)!;
    const {x,y} = isoToScreen(pb.col, pb.row, 0, 0, zoomRef.current);
    offsetRef.current = { x:c.width/2-x, y:c.height/2-y };
  }, []);

  // ── Scene renderer (shared between main canvas and minimap export) ──────
  const drawScene = useCallback((
    ctx: CanvasRenderingContext2D,
    ox: number, oy: number, z: number, ts: number, w: number, h: number,
  ) => {
    const hw = TW/2*z, hh = TH/2*z;
    ctx.fillStyle='#080a10'; ctx.fillRect(0,0,w,h);

    // Territory zones
    zonesRef.current.forEach(zone => {
      const col = RACE_COL[zone.race];
      for (let r=0; r<ROWS; r++) for (let c=0; c<COLS; c++) {
        const dc=c-zone.centerCol, dr=r-zone.centerRow;
        const dist=Math.sqrt(dc*dc+dr*dr); if (dist>zone.radius) continue;
        const fade=1-dist/zone.radius;
        const {x,y}=isoToScreen(c,r,ox,oy,z);
        ctx.beginPath();
        ctx.moveTo(x,y-hh); ctx.lineTo(x+hw,y); ctx.lineTo(x,y+hh); ctx.lineTo(x-hw,y);
        ctx.closePath();
        ctx.fillStyle=`${col}${Math.floor((0.05+0.09*fade)*255).toString(16).padStart(2,'0')}`;
        ctx.fill();
      }
      const pulse=(Math.sin(ts/900)+1)/2;
      ctx.strokeStyle=`${col}${Math.floor((0.12+0.28*pulse)*255).toString(16).padStart(2,'0')}`;
      ctx.lineWidth=1.5*z;
      for (let r=0; r<ROWS; r++) for (let c=0; c<COLS; c++) {
        const dc=c-zone.centerCol, dr=r-zone.centerRow;
        const dist=Math.sqrt(dc*dc+dr*dr);
        if (dist<zone.radius-1.3 || dist>zone.radius+0.3) continue;
        const {x,y}=isoToScreen(c,r,ox,oy,z);
        ctx.beginPath();
        ctx.moveTo(x,y-hh); ctx.lineTo(x+hw,y); ctx.lineTo(x,y+hh); ctx.lineTo(x-hw,y);
        ctx.closePath(); ctx.stroke();
      }
    });

    // Tiles
    for (let r=0; r<ROWS; r++) for (let c=0; c<COLS; c++) {
      const pal=TILE_PAL[tilesRef.current[r][c]];
      const {x,y}=isoToScreen(c,r,ox,oy,z);
      ctx.beginPath();
      ctx.moveTo(x,y-hh); ctx.lineTo(x+hw,y); ctx.lineTo(x,y+hh); ctx.lineTo(x-hw,y);
      ctx.closePath();
      ctx.fillStyle=pal.top; ctx.fill();
      ctx.strokeStyle=pal.border; ctx.lineWidth=0.5; ctx.stroke();
    }

    // Selection highlight
    const sel=selRef.current;
    if (sel) {
      const {x,y}=isoToScreen(sel.col,sel.row,ox,oy,z);
      const p=(Math.sin(ts/400)+1)/2;
      ctx.beginPath();
      ctx.moveTo(x,y-hh-4*z); ctx.lineTo(x+hw+4*z,y); ctx.lineTo(x,y+hh+4*z); ctx.lineTo(x-hw-4*z,y);
      ctx.closePath();
      ctx.strokeStyle=`rgba(255,255,255,${0.4+0.4*p})`; ctx.lineWidth=1.5*z; ctx.stroke();
    }

    // Resource nodes
    const RES_COL={mineral:'#4a9eff',gas:'#44ff88',energy:'#ffc832'};
    resRef.current.forEach(res => {
      const {x,y}=isoToScreen(res.col,res.row,ox,oy,z);
      const col=RES_COL[res.kind];
      const p=(Math.sin(ts/700+res.col*0.7)+1)/2;
      const rr=(10+7*p)*z;
      const gr=ctx.createRadialGradient(x,y,0,x,y,rr);
      gr.addColorStop(0,`${col}55`); gr.addColorStop(1,`${col}00`);
      ctx.beginPath(); ctx.arc(x,y,rr,0,Math.PI*2); ctx.fillStyle=gr; ctx.fill();
      ctx.beginPath(); ctx.arc(x,y,4.5*z,0,Math.PI*2); ctx.fillStyle=col; ctx.fill();
    });

    // Enemy units
    enemiesRef.current.forEach(enemy => {
      const {x,y}=isoToScreen(enemy.fcol,enemy.frow,ox,oy,z);
      const p=(Math.sin(ts/550+enemy.id.length)+1)/2;
      const gr=ctx.createRadialGradient(x,y,0,x,y,(15+5*p)*z);
      gr.addColorStop(0,'rgba(255,30,30,0.45)'); gr.addColorStop(1,'rgba(255,30,30,0)');
      ctx.beginPath(); ctx.arc(x,y,(15+5*p)*z,0,Math.PI*2); ctx.fillStyle=gr; ctx.fill();
      const s=6.5*z;
      ctx.save(); ctx.translate(x,y); ctx.rotate(Math.PI/4);
      ctx.fillStyle='#cc1111'; ctx.fillRect(-s/2,-s/2,s,s);
      ctx.strokeStyle=RACE_COL[enemy.race]; ctx.lineWidth=z; ctx.strokeRect(-s/2,-s/2,s,s);
      ctx.restore();
    });

    // Player bases
    basesRef.current.forEach(base => {
      const {x,y}=isoToScreen(base.col,base.row,ox,oy,z);
      const col=RACE_COL[base.race];
      const p=(Math.sin(ts/1100+base.col*0.4)+1)/2;
      const glowR=(base.isPlayer?36:26)*z+8*z*p;
      const gr=ctx.createRadialGradient(x,y,0,x,y,glowR);
      gr.addColorStop(0,`${col}55`); gr.addColorStop(0.5,`${col}22`); gr.addColorStop(1,`${col}00`);
      ctx.beginPath(); ctx.arc(x,y,glowR,0,Math.PI*2); ctx.fillStyle=gr; ctx.fill();
      const R=(base.isPlayer?14:11)*z;
      ctx.beginPath(); ctx.arc(x,y,R,0,Math.PI*2); ctx.fillStyle='#0a0e1a'; ctx.fill();
      ctx.strokeStyle=col; ctx.lineWidth=(base.isPlayer?2.5:1.8)*z; ctx.stroke();
      if (base.isPlayer) {
        ctx.beginPath(); ctx.arc(x,y,R+5*z,0,Math.PI*2);
        ctx.strokeStyle=`${col}44`; ctx.lineWidth=z; ctx.stroke();
      }
      if (z>0.55) {
        const fs=Math.max(7,10*z);
        ctx.font=`bold ${fs}px 'Orbitron',monospace`;
        ctx.fillStyle=col; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(`${base.level}`,x,y);
      }
      if (z>0.8) {
        ctx.font=`${Math.max(7,8.5*z)}px 'Rajdhani',sans-serif`;
        ctx.fillStyle='rgba(232,232,240,0.85)'; ctx.textAlign='center'; ctx.textBaseline='top';
        ctx.fillText(base.name,x,y+R+5*z);
      }
    });
  }, []);

  // ── Minimap export ────────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    drawMinimap(ctx: CanvasRenderingContext2D, w: number, h: number) {
      const scaleX=w/((COLS-ROWS)*(TW/2)*2);
      const scaleY=h/((COLS+ROWS)*(TH/2));
      const scale=Math.min(scaleX,scaleY)*0.8;
      const mapW=(COLS-ROWS)*(TW/2)*scale;
      const mapH=(COLS+ROWS)*(TH/2)*scale;
      const ox=w/2-mapW/2+ROWS*(TW/2)*scale;
      const oy=(h-mapH)/2;
      drawScene(ctx,ox,oy,scale,performance.now(),w,h);
      const canvas=canvasRef.current; if (!canvas) return;
      const cvOx=offsetRef.current.x, cvOy=offsetRef.current.y, z=zoomRef.current;
      const toM=(sx:number,sy:number)=>{
        const{col,row}=screenToIso(sx,sy,cvOx,cvOy,z);
        return isoToScreen(col,row,ox,oy,scale);
      };
      const tl=toM(0,0),tr=toM(canvas.width,0),br=toM(canvas.width,canvas.height),bl=toM(0,canvas.height);
      ctx.beginPath();
      ctx.moveTo(tl.x,tl.y); ctx.lineTo(tr.x,tr.y); ctx.lineTo(br.x,br.y); ctx.lineTo(bl.x,bl.y);
      ctx.closePath();
      ctx.strokeStyle='rgba(255,255,255,0.55)'; ctx.lineWidth=1; ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,0.06)'; ctx.fill();
    },
  }), [drawScene]);

  // ── Main loop ─────────────────────────────────────────────────────────────
  const loop = useCallback((ts: number) => {
    const canvas=canvasRef.current; if (!canvas) return;
    const ctx=canvas.getContext('2d')!;
    const dt=Math.min((ts-timeRef.current)/1000,0.05);
    timeRef.current=ts;
    const SPEED=0.25;
    enemiesRef.current.forEach(e => {
      e.progress=Math.min(1,e.progress+dt*SPEED);
      if (e.progress>=1) {
        e.progress=0; e.col=e.targetCol; e.row=e.targetRow; e.fcol=e.col; e.frow=e.row;
        e.pathIdx=(e.pathIdx+1)%e.patrolPath.length;
        const nxt=e.patrolPath[(e.pathIdx+1)%e.patrolPath.length];
        e.targetCol=nxt[0]; e.targetRow=nxt[1];
      }
      const t=e.progress<0.5?2*e.progress*e.progress:1-Math.pow(-2*e.progress+2,2)/2;
      e.fcol=e.col+(e.targetCol-e.col)*t;
      e.frow=e.row+(e.targetRow-e.row)*t;
    });
    drawScene(ctx,offsetRef.current.x,offsetRef.current.y,zoomRef.current,ts,canvas.width,canvas.height);
    rafRef.current=requestAnimationFrame(loop);
  }, [drawScene]);

  useEffect(() => {
    rafRef.current=requestAnimationFrame(loop);
    return ()=>cancelAnimationFrame(rafRef.current);
  }, [loop]);

  useEffect(() => {
    const canvas=canvasRef.current; if (!canvas) return;
    const ro=new ResizeObserver(()=>{ canvas.width=canvas.offsetWidth; canvas.height=canvas.offsetHeight; centerOnPlayer(); });
    ro.observe(canvas);
    return ()=>ro.disconnect();
  }, [centerOnPlayer]);

  // ── Hit testing ──────────────────────────────────────────────────────────
  const hitTest = useCallback((cx: number, cy: number): HitTarget|null => {
    const canvas=canvasRef.current; if (!canvas) return null;
    const rect=canvas.getBoundingClientRect();
    const sx=cx-rect.left, sy=cy-rect.top;
    const{col,row}=screenToIso(sx,sy,offsetRef.current.x,offsetRef.current.y,zoomRef.current);
    if (col<0||col>=COLS||row<0||row>=ROWS) return null;
    const{x,y}=isoToScreen(col,row,offsetRef.current.x,offsetRef.current.y,zoomRef.current);
    const absX=x+rect.left, absY=y+rect.top;
    const base=basesRef.current.find(b=>b.col===col&&b.row===row);
    if (base) return { kind:'base',col,row,screenX:absX,screenY:absY,base };
    const resource=resRef.current.find(r=>r.col===col&&r.row===row);
    if (resource) return { kind:'resource',col,row,screenX:absX,screenY:absY,resource };
    const enemy=enemiesRef.current.find(e=>Math.round(e.fcol)===col&&Math.round(e.frow)===row);
    if (enemy) return { kind:'enemy',col,row,screenX:absX,screenY:absY,enemy };
    return { kind:'empty',col,row,screenX:absX,screenY:absY };
  }, []);

  // ── Mouse handlers ────────────────────────────────────────────────────────
  const onMouseDown=useCallback((e: React.MouseEvent)=>{
    dragRef.current={active:true,sx:e.clientX,sy:e.clientY,ox:offsetRef.current.x,oy:offsetRef.current.y};
  },[]);
  const onMouseMove=useCallback((e: React.MouseEvent)=>{
    if (!dragRef.current.active) return;
    offsetRef.current={x:dragRef.current.ox+(e.clientX-dragRef.current.sx),y:dragRef.current.oy+(e.clientY-dragRef.current.sy)};
  },[]);
  const onMouseUp=useCallback((e: React.MouseEvent)=>{
    const wasDrag=Math.abs(e.clientX-dragRef.current.sx)>5||Math.abs(e.clientY-dragRef.current.sy)>5;
    dragRef.current.active=false;
    if (!wasDrag) { const t=hitTest(e.clientX,e.clientY); selRef.current=t; onSelect?.(t); }
  },[hitTest,onSelect]);
  const onWheel=useCallback((e: React.WheelEvent)=>{
    e.preventDefault();
    const rect=canvasRef.current!.getBoundingClientRect();
    const mx=e.clientX-rect.left, my=e.clientY-rect.top;
    const factor=e.deltaY>0?0.88:1.13;
    const oldZ=zoomRef.current, newZ=Math.max(ZOOM_MIN,Math.min(ZOOM_MAX,oldZ*factor));
    offsetRef.current.x=mx-(mx-offsetRef.current.x)*(newZ/oldZ);
    offsetRef.current.y=my-(my-offsetRef.current.y)*(newZ/oldZ);
    zoomRef.current=newZ;
  },[]);

  // ── Touch handlers ────────────────────────────────────────────────────────
  const touchRef=useRef({x:0,y:0,ox:0,oy:0,dist:0,zoom:1});
  const onTouchStart=useCallback((e: React.TouchEvent)=>{
    if (e.touches.length===1) touchRef.current={x:e.touches[0].clientX,y:e.touches[0].clientY,ox:offsetRef.current.x,oy:offsetRef.current.y,dist:0,zoom:zoomRef.current};
    else if (e.touches.length===2) { const dx=e.touches[1].clientX-e.touches[0].clientX,dy=e.touches[1].clientY-e.touches[0].clientY; touchRef.current.dist=Math.hypot(dx,dy); touchRef.current.zoom=zoomRef.current; }
  },[]);
  const onTouchMove=useCallback((e: React.TouchEvent)=>{
    e.preventDefault();
    if (e.touches.length===1) { const t=touchRef.current; offsetRef.current={x:t.ox+(e.touches[0].clientX-t.x),y:t.oy+(e.touches[0].clientY-t.y)}; }
    else if (e.touches.length===2) { const dx=e.touches[1].clientX-e.touches[0].clientX,dy=e.touches[1].clientY-e.touches[0].clientY; zoomRef.current=Math.max(ZOOM_MIN,Math.min(ZOOM_MAX,touchRef.current.zoom*(Math.hypot(dx,dy)/touchRef.current.dist))); }
  },[]);
  const onTouchEnd=useCallback((e: React.TouchEvent)=>{
    if (e.changedTouches.length===1) {
      const t=touchRef.current, dx=e.changedTouches[0].clientX-t.x, dy=e.changedTouches[0].clientY-t.y;
      if (Math.hypot(dx,dy)<8) { const target=hitTest(e.changedTouches[0].clientX,e.changedTouches[0].clientY); selRef.current=target; onSelect?.(target); }
    }
  },[hitTest,onSelect]);

  return (
    <canvas
      ref={canvasRef}
      className={`block w-full h-full ${className??''}`}
      style={{ cursor:'grab', touchAction:'none' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={()=>{ dragRef.current.active=false; }}
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    />
  );
});

export default WorldMap;
