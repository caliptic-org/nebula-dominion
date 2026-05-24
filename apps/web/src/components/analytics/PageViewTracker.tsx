'use client';

/**
 * App Router SPA navigation page-view tracker + first-touch attribution.
 *
 * Next.js App Router does NOT fire gtag's auto page_view on client-side route
 * changes (only the initial server-rendered page emits one). This component
 * watches `usePathname()` + `useSearchParams()` and emits a `page_view` to
 * both GA4 and FB Pixel on every navigation.
 *
 * Also runs `captureAttribution()` once on first mount — that pulls gclid /
 * fbclid / utm_* from the URL and stores them in localStorage for later
 * conversion attribution. First-touch semantics: subsequent visits don't
 * overwrite a still-fresh capture.
 *
 * Mount once in RootLayout, inside <Suspense> because useSearchParams() needs
 * one when statically rendered.
 */

import { Suspense, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackPageView } from '@/lib/analytics';
import { captureAttribution } from '@/lib/attribution';

function PageViewTrackerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // First-mount-only: capture ad-click IDs from landing URL.
  useEffect(() => {
    captureAttribution();
  }, []);

  useEffect(() => {
    if (!pathname) return;
    const qs = searchParams?.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    trackPageView(url);
  }, [pathname, searchParams]);

  return null;
}

export function PageViewTracker() {
  return (
    <Suspense fallback={null}>
      <PageViewTrackerInner />
    </Suspense>
  );
}
