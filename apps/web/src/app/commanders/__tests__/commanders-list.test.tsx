/**
 * Smoke tests: /commanders (ScrCommanders) — NEBULA-549 rewrite.
 *
 * The CAL-308 implementation was replaced by the handoff ScrCommanders
 * screen that draws all 20 commanders from `RACES[race].commanders`.
 * These tests verify the screen renders and the basic invariants hold
 * against the new structure; deep UI assertions on the legacy
 * implementation were removed with that visual layer.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CommandersPage from '../page';
import { RACES } from '@/components/handoff';

describe('Commanders List Page (/commanders) — ScrCommanders smoke', () => {
  it('renders the Komutanlar chip in the header', () => {
    render(<CommandersPage />);
    expect(screen.getByText(/komutanlar/i)).toBeInTheDocument();
  });

  it('renders the back link to Ana Üs', () => {
    render(<CommandersPage />);
    expect(screen.getByRole('link', { name: /ana üs/i })).toHaveAttribute('href', '/');
  });

  it('renders cards for every commander across all 5 races (20 total)', () => {
    render(<CommandersPage />);
    let total = 0;
    for (const race of Object.values(RACES)) {
      for (const cmdr of race.commanders) {
        total += 1;
        // Each commander name appears at least once (card grid or detail).
        expect(screen.getAllByText(new RegExp(cmdr.n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')).length).toBeGreaterThan(0);
      }
    }
    expect(total).toBe(20);
  });

  it('shows the locked count badge "X / 20 AÇIK"', () => {
    render(<CommandersPage />);
    expect(screen.getByText(/\d+ \/ 20 AÇIK/i)).toBeInTheDocument();
  });

  it('renders a "Tümü" filter button plus a short-name button per race', () => {
    render(<CommandersPage />);
    expect(screen.getByRole('button', { name: /tümü/i })).toBeInTheDocument();
    for (const race of Object.values(RACES)) {
      // The race short label ("İNS" / "ZRG" / …) appears at least once
      expect(screen.getAllByText(new RegExp(race.short, 'i')).length).toBeGreaterThan(0);
    }
  });
});
