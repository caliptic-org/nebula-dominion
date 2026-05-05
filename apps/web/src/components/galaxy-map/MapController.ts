import { ZOOM_MIN, ZOOM_MAX, getZoomLevel, type ZoomLevel } from './types';

/**
 * MapController — pure transform engine for Galaxy Map v2.
 *
 * Owns scale + origin and applies them as a single GPU-composited
 * `translate() scale()` to the layered root. No layout reflow on pan/zoom.
 *
 * Subscribes via `onChange` to drive React state (zoom level, scale badge).
 */
export class MapController {
  scale = 0.3;
  origin = { x: 0, y: 0 };

  private container: HTMLElement | null = null;
  private layer: HTMLElement | null = null;
  private listeners = new Set<(s: { scale: number; level: ZoomLevel }) => void>();

  // Drag state
  private dragging = false;
  private dragLast = { x: 0, y: 0 };

  // Pinch state
  private pinch: { startDist: number; startScale: number; midX: number; midY: number } | null = null;

  // Reusable bound handlers
  private onWheelBound = (e: WheelEvent) => this.onWheel(e);
  private onPointerDownBound = (e: PointerEvent) => this.onPointerDown(e);
  private onPointerMoveBound = (e: PointerEvent) => this.onPointerMove(e);
  private onPointerUpBound = () => this.onPointerUp();
  private onTouchStartBound = (e: TouchEvent) => this.onTouchStart(e);
  private onTouchMoveBound = (e: TouchEvent) => this.onTouchMove(e);
  private onTouchEndBound = (e: TouchEvent) => this.onTouchEnd(e);

  attach(container: HTMLElement, layer: HTMLElement) {
    this.container = container;
    this.layer = layer;
    container.addEventListener('wheel', this.onWheelBound, { passive: false });
    container.addEventListener('pointerdown', this.onPointerDownBound);
    window.addEventListener('pointermove', this.onPointerMoveBound);
    window.addEventListener('pointerup', this.onPointerUpBound);
    container.addEventListener('touchstart', this.onTouchStartBound, { passive: false });
    container.addEventListener('touchmove', this.onTouchMoveBound, { passive: false });
    container.addEventListener('touchend', this.onTouchEndBound);
    this.applyTransform();
    this.emit();
  }

  detach() {
    if (!this.container) return;
    this.container.removeEventListener('wheel', this.onWheelBound);
    this.container.removeEventListener('pointerdown', this.onPointerDownBound);
    window.removeEventListener('pointermove', this.onPointerMoveBound);
    window.removeEventListener('pointerup', this.onPointerUpBound);
    this.container.removeEventListener('touchstart', this.onTouchStartBound);
    this.container.removeEventListener('touchmove', this.onTouchMoveBound);
    this.container.removeEventListener('touchend', this.onTouchEndBound);
    this.container = null;
    this.layer = null;
    this.listeners.clear();
  }

  onChange(cb: (s: { scale: number; level: ZoomLevel }) => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /** Programmatic zoom step from a UI button — pivots on container center. */
  zoomBy(factor: number) {
    if (!this.container) return;
    const rect = this.container.getBoundingClientRect();
    this.zoomAt(this.scale * factor, rect.width / 2, rect.height / 2);
  }

  /** Center the viewport on a world coord and set a target scale. */
  centerOn(worldX: number, worldY: number, targetScale = this.scale) {
    if (!this.container) return;
    const rect = this.container.getBoundingClientRect();
    this.scale = clamp(targetScale, ZOOM_MIN, ZOOM_MAX);
    this.origin.x = rect.width / 2 - worldX * this.scale;
    this.origin.y = rect.height / 2 - worldY * this.scale;
    this.applyTransform();
    this.emit();
  }

  private onWheel(e: WheelEvent) {
    e.preventDefault();
    if (!this.container) return;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const rect = this.container.getBoundingClientRect();
    this.zoomAt(this.scale * delta, e.clientX - rect.left, e.clientY - rect.top);
  }

  /** Zoom around a screen-space pivot (mouse position). Stable under repeated wheel events. */
  private zoomAt(targetScale: number, sx: number, sy: number) {
    const newScale = clamp(targetScale, ZOOM_MIN, ZOOM_MAX);
    if (newScale === this.scale) return;
    this.origin.x = sx - (sx - this.origin.x) * (newScale / this.scale);
    this.origin.y = sy - (sy - this.origin.y) * (newScale / this.scale);
    this.scale = newScale;
    this.markZooming();
    this.applyTransform();
    this.emit();
  }

  private onPointerDown(e: PointerEvent) {
    // Only primary button — wheel-click-pan etc. is intentionally ignored
    if (e.button !== 0 || e.pointerType === 'touch') return;
    this.dragging = true;
    this.dragLast = { x: e.clientX, y: e.clientY };
    this.markZooming();
  }

  private onPointerMove(e: PointerEvent) {
    if (!this.dragging) return;
    const dx = e.clientX - this.dragLast.x;
    const dy = e.clientY - this.dragLast.y;
    this.dragLast = { x: e.clientX, y: e.clientY };
    this.origin.x += dx;
    this.origin.y += dy;
    this.applyTransform();
  }

  private onPointerUp() {
    if (!this.dragging) return;
    this.dragging = false;
    this.unmarkZooming();
  }

  private onTouchStart(e: TouchEvent) {
    if (e.touches.length === 2 && this.container) {
      const [t1, t2] = [e.touches[0], e.touches[1]];
      const rect = this.container.getBoundingClientRect();
      this.pinch = {
        startDist: Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY),
        startScale: this.scale,
        midX: (t1.clientX + t2.clientX) / 2 - rect.left,
        midY: (t1.clientY + t2.clientY) / 2 - rect.top,
      };
      this.markZooming();
      e.preventDefault();
    } else if (e.touches.length === 1) {
      this.dragging = true;
      this.dragLast = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      this.markZooming();
    }
  }

  private onTouchMove(e: TouchEvent) {
    if (this.pinch && e.touches.length === 2) {
      const [t1, t2] = [e.touches[0], e.touches[1]];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const target = this.pinch.startScale * (dist / this.pinch.startDist);
      this.zoomAt(target, this.pinch.midX, this.pinch.midY);
      e.preventDefault();
    } else if (this.dragging && e.touches.length === 1) {
      const t = e.touches[0];
      const dx = t.clientX - this.dragLast.x;
      const dy = t.clientY - this.dragLast.y;
      this.dragLast = { x: t.clientX, y: t.clientY };
      this.origin.x += dx;
      this.origin.y += dy;
      this.applyTransform();
      e.preventDefault();
    }
  }

  private onTouchEnd(e: TouchEvent) {
    if (e.touches.length < 2) this.pinch = null;
    if (e.touches.length === 0) this.dragging = false;
    this.unmarkZooming();
  }

  private applyTransform() {
    if (!this.layer) return;
    this.layer.style.transform =
      `translate(${this.origin.x}px, ${this.origin.y}px) scale(${this.scale})`;
  }

  /** Adds will-change during interaction so the browser GPU-promotes early. */
  private markZooming() {
    if (this.layer) this.layer.style.willChange = 'transform';
    if (this.container) this.container.dataset.zooming = 'true';
  }

  private unmarkZooming() {
    if (this.layer) this.layer.style.willChange = '';
    if (this.container) delete this.container.dataset.zooming;
  }

  private emit() {
    const level = getZoomLevel(this.scale);
    if (this.container) this.container.dataset.zoom = level;
    for (const cb of this.listeners) cb({ scale: this.scale, level });
  }
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
