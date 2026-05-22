'use client';

/**
 * /progression — Tier Yükseliş ekranı (re-exports /tier-up content).
 *
 * NEBULA-549 consolidated the tier ladder + age cinematic into the single
 * `ScrTierUp` screen. Both `/tier-up` and `/progression` routes render the
 * same component to keep deep links working.
 */

export { default } from '@/app/tier-up/page';
