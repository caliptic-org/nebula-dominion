'use client';

import { useEffect, useState } from 'react';
import { ND } from './nd-tokens';

/* Global toast bus.
 *
 * Every screen's "button feedback" goes through this — a single CSS-only
 * stack that mounts in the root layout. Anywhere in the tree can fire:
 *
 *     import { toast } from '@/components/handoff/Toaster';
 *     toast.success('İnşaat başlatıldı');
 *     toast.error('Yetersiz mineral');
 *     toast.info('Yakında geliyor');
 *
 * No React context required — uses a plain window-level event bus so
 * non-React layers (fetch callbacks, hooks, services) can post too.
 * Toasts auto-dismiss after 3.5s, can be clicked to dismiss early.
 *
 * Why a bus and not a Provider: most buttons we're wiring this hour are
 * inside `'use client'` components that already call services. Adding a
 * Provider would force every callsite to thread the hook; a bus keeps the
 * call site to a single `toast.success(...)` line. */

const EVT = 'nd:toast';
let nextId = 1;

export type ToastKind = 'success' | 'error' | 'info';
export interface ToastMessage {
  id: number;
  kind: ToastKind;
  text: string;
}

interface ToastDetail extends ToastMessage {}

function emit(kind: ToastKind, text: string) {
  if (typeof window === 'undefined') return;
  const msg: ToastDetail = { id: nextId++, kind, text };
  window.dispatchEvent(new CustomEvent(EVT, { detail: msg }));
}

export const toast = {
  success: (text: string) => emit('success', text),
  error:   (text: string) => emit('error',   text),
  info:    (text: string) => emit('info',    text),
};

/** Mount once in the root layout. Listens to the bus, renders a stack at
 *  the top-right. Pointer-events are scoped so the stack never blocks UI. */
export function Toaster() {
  const [items, setItems] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const onEvt = (e: Event) => {
      const detail = (e as CustomEvent<ToastDetail>).detail;
      if (!detail) return;
      setItems((cur) => [...cur, detail]);
      // Auto-dismiss after 3.5s.
      window.setTimeout(() => {
        setItems((cur) => cur.filter((m) => m.id !== detail.id));
      }, 3500);
    };
    window.addEventListener(EVT, onEvt);
    return () => window.removeEventListener(EVT, onEvt);
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 'calc(8px + env(safe-area-inset-top, 0px))',
        right: 8,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        pointerEvents: 'none',
        maxWidth: 320,
      }}
    >
      {items.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => setItems((cur) => cur.filter((x) => x.id !== m.id))}
          style={{
            all: 'unset',
            cursor: 'pointer',
            pointerEvents: 'auto',
            padding: '8px 12px',
            fontFamily: ND.mono,
            fontSize: 12,
            letterSpacing: '0.04em',
            color: m.kind === 'error' ? ND.danger : ND.text,
            background:
              m.kind === 'success'
                ? 'rgba(8,16,28,0.95)'
                : m.kind === 'error'
                ? 'rgba(34,8,8,0.95)'
                : 'rgba(10,14,28,0.95)',
            border: `1px solid ${
              m.kind === 'success'
                ? 'oklch(0.74 0.16 150)'
                : m.kind === 'error'
                ? 'oklch(0.65 0.22 25)'
                : ND.border
            }`,
            borderRadius: 4,
            boxShadow:
              m.kind === 'success'
                ? '0 0 16px -4px oklch(0.74 0.16 150 / 0.4)'
                : m.kind === 'error'
                ? '0 0 16px -4px oklch(0.65 0.22 25 / 0.4)'
                : '0 4px 12px rgba(0,0,0,0.4)',
            animation: 'nd-slide-up 220ms ease-out',
          }}
          aria-label={`Bildirimi kapat: ${m.text}`}
        >
          <span
            aria-hidden
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              marginRight: 8,
              borderRadius: '50%',
              verticalAlign: 'middle',
              background:
                m.kind === 'success'
                  ? 'oklch(0.74 0.16 150)'
                  : m.kind === 'error'
                  ? 'oklch(0.65 0.22 25)'
                  : ND.textDim,
            }}
          />
          {m.text}
        </button>
      ))}
    </div>
  );
}
