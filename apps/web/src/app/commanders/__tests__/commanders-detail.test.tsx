/**
 * E2E Tests: Commander Detail Page — CAL-308
 *
 * Scenarios:
 * 5. Detail page: portrait, 4 tabs (Hikaye, Yetenekler, Ekipman, Güçlendir)
 * 6. Skill tree level-gate works correctly
 * 7. 6 equipment slots visible
 * 8. Equipment attach/detach API call (slot button interaction)
 */
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import CommanderDetailPage from '../[id]/page';
import { COMMANDERS, RACE_THEMES } from '../data';
import { SLOT_ORDER, SLOT_META } from '@/types/equipment';

const UNLOCKED_COMMANDER = COMMANDERS.find((c) => c.isUnlocked)!;
const LOCKED_COMMANDER = COMMANDERS.find((c) => !c.isUnlocked)!;
const HIGH_LEVEL_COMMANDER = COMMANDERS.reduce((prev, curr) =>
  curr.level > prev.level ? curr : prev
);

function renderDetailPage(id: string) {
  return render(<CommanderDetailPage params={{ id }} />);
}

describe('Commander Detail Page (/commanders/[id])', () => {
  // ── 5a. Portrait ────────────────────────────────────────────────────────────

  describe('portrait', () => {
    it('renders the commander portrait image', () => {
      renderDetailPage(UNLOCKED_COMMANDER.id);
      const images = screen.getAllByTestId('next-image');
      expect(images.length).toBeGreaterThan(0);
    });

    it('renders the commander name as h1', () => {
      renderDetailPage(UNLOCKED_COMMANDER.id);
      expect(
        screen.getByRole('heading', { level: 1, name: new RegExp(UNLOCKED_COMMANDER.name) })
      ).toBeInTheDocument();
    });

    it('renders the level badge in the header', () => {
      renderDetailPage(UNLOCKED_COMMANDER.id);
      // The header contains "Lv X" badge
      const header = screen.getByRole('banner');
      expect(
        within(header).getByText(new RegExp(`Lv ${UNLOCKED_COMMANDER.level}`))
      ).toBeInTheDocument();
    });

    it('renders the back link to /commanders', () => {
      renderDetailPage(UNLOCKED_COMMANDER.id);
      expect(screen.getByRole('link', { name: /komutanlar/i })).toHaveAttribute(
        'href',
        '/commanders'
      );
    });

    it('renders race theme name in the breadcrumb area', () => {
      renderDetailPage(UNLOCKED_COMMANDER.id);
      const theme = RACE_THEMES[UNLOCKED_COMMANDER.race];
      // The breadcrumb span in the header contains the race name — use getAllByText
      const raceTexts = screen.getAllByText(new RegExp(theme.name));
      expect(raceTexts.length).toBeGreaterThan(0);
    });

    it('locked commander shows lock overlay text "Kilitli Komutan"', () => {
      renderDetailPage(LOCKED_COMMANDER.id);
      expect(screen.getByText(/kilitli komutan/i)).toBeInTheDocument();
    });

    it('locked commander portrait has grayscale class applied', () => {
      renderDetailPage(LOCKED_COMMANDER.id);
      const img = screen.getAllByTestId('next-image')[0];
      expect(img.className).toMatch(/grayscale/);
    });
  });

  // ── 5b. 4 Tabs ──────────────────────────────────────────────────────────────

  describe('4 tabs', () => {
    const TAB_LABELS = ['Hikaye', 'Yetenekler', 'Ekipman', 'Güçlendir'];

    it('renders all 4 tab buttons', () => {
      renderDetailPage(UNLOCKED_COMMANDER.id);
      for (const label of TAB_LABELS) {
        expect(
          screen.getByRole('button', { name: new RegExp(`^${label}$`, 'i') })
        ).toBeInTheDocument();
      }
    });

    it('defaults to the Hikaye tab showing story content', () => {
      renderDetailPage(UNLOCKED_COMMANDER.id);
      expect(screen.getByText(/komutan hikayesi/i)).toBeInTheDocument();
      expect(screen.getByText(UNLOCKED_COMMANDER.story)).toBeInTheDocument();
    });

    it('Hikaye tab shows traits section', () => {
      renderDetailPage(UNLOCKED_COMMANDER.id);
      // "Özellikler" heading is in the hikaye tab only
      expect(screen.getAllByText(/özellikler/i).length).toBeGreaterThan(0);
    });

    it('Hikaye tab shows combat stats section', () => {
      renderDetailPage(UNLOCKED_COMMANDER.id);
      // "Savaş İstatistikleri" heading is in the hikaye tab only
      // Use exact text to avoid Turkish dotted-I case-folding issues with /i flag
      expect(screen.getByText('Savaş İstatistikleri')).toBeInTheDocument();
    });

    it('switching to Yetenekler tab shows the skill tree', () => {
      renderDetailPage(UNLOCKED_COMMANDER.id);
      fireEvent.click(screen.getByRole('button', { name: /^yetenekler$/i }));
      expect(screen.getByText(/yetenek ağacı/i)).toBeInTheDocument();
    });

    it('switching to Ekipman tab shows equipment slots section', () => {
      renderDetailPage(UNLOCKED_COMMANDER.id);
      fireEvent.click(screen.getByRole('button', { name: /^ekipman$/i }));
      expect(screen.getByText(/ekipman slotları/i)).toBeInTheDocument();
    });

    it('switching to Güçlendir tab shows XP bar', () => {
      renderDetailPage(UNLOCKED_COMMANDER.id);
      fireEvent.click(screen.getByRole('button', { name: /^güçlendir$/i }));
      // The deneyim label is unique to the Güçlendir tab
      expect(screen.getByText(/^deneyim$/i)).toBeInTheDocument();
    });

    it('tab switching is idempotent — clicking same tab twice keeps content', () => {
      renderDetailPage(UNLOCKED_COMMANDER.id);
      fireEvent.click(screen.getByRole('button', { name: /^yetenekler$/i }));
      fireEvent.click(screen.getByRole('button', { name: /^yetenekler$/i }));
      expect(screen.getByText(/yetenek ağacı/i)).toBeInTheDocument();
    });

    it('each tab button is clickable', () => {
      renderDetailPage(UNLOCKED_COMMANDER.id);
      for (const label of TAB_LABELS) {
        const btn = screen.getByRole('button', { name: new RegExp(`^${label}$`, 'i') });
        expect(btn).toBeEnabled();
        fireEvent.click(btn);
      }
    });
  });

  // ── 6. Skill tree level gates ───────────────────────────────────────────────

  describe('skill tree level gates', () => {
    const SKILL_LEVEL_GATES = [1, 3, 5, 7];

    it('shows all abilities in the skill tree', () => {
      renderDetailPage(UNLOCKED_COMMANDER.id);
      fireEvent.click(screen.getByRole('button', { name: /^yetenekler$/i }));

      for (const ability of UNLOCKED_COMMANDER.abilities) {
        expect(screen.getByText(ability)).toBeInTheDocument();
      }
    });

    it('abilities at or below currentLevel are marked "Açık"', () => {
      renderDetailPage(UNLOCKED_COMMANDER.id);
      fireEvent.click(screen.getByRole('button', { name: /^yetenekler$/i }));

      const unlockedAbilities = UNLOCKED_COMMANDER.abilities.filter(
        (_, i) => UNLOCKED_COMMANDER.level >= (SKILL_LEVEL_GATES[i] ?? 7)
      );

      if (unlockedAbilities.length > 0) {
        const acikLabels = screen.getAllByText('Açık');
        expect(acikLabels.length).toBeGreaterThanOrEqual(unlockedAbilities.length);
      }
    });

    it('abilities requiring higher level show "Lv X gerek" text', () => {
      renderDetailPage(UNLOCKED_COMMANDER.id);
      fireEvent.click(screen.getByRole('button', { name: /^yetenekler$/i }));

      const lockedAbilityIndexes = UNLOCKED_COMMANDER.abilities
        .map((_, i) => i)
        .filter((i) => UNLOCKED_COMMANDER.level < (SKILL_LEVEL_GATES[i] ?? 7));

      if (lockedAbilityIndexes.length > 0) {
        const gerekTexts = screen.getAllByText(/lv \d+ gerek/i);
        expect(gerekTexts.length).toBeGreaterThanOrEqual(lockedAbilityIndexes.length);
      }
    });

    it('shows level gate labels (Lv1, Lv3, Lv5, Lv7) on skill nodes', () => {
      renderDetailPage(HIGH_LEVEL_COMMANDER.id);
      fireEvent.click(screen.getByRole('button', { name: /^yetenekler$/i }));

      const relevantGates = SKILL_LEVEL_GATES.slice(
        0,
        HIGH_LEVEL_COMMANDER.abilities.length
      );
      for (const gate of relevantGates) {
        expect(screen.getAllByText(new RegExp(`Lv${gate}`)).length).toBeGreaterThan(0);
      }
    });

    it('high-level commander has first ability unlocked (gate: Lv1)', () => {
      renderDetailPage(HIGH_LEVEL_COMMANDER.id);
      fireEvent.click(screen.getByRole('button', { name: /^yetenekler$/i }));
      const acikLabels = screen.getAllByText('Açık');
      expect(acikLabels.length).toBeGreaterThan(0);
    });

    it('commander with level < 3 has second ability locked', () => {
      const lowLevel = COMMANDERS.find((c) => c.level < 3 && c.abilities.length >= 2);
      if (!lowLevel) return;

      renderDetailPage(lowLevel.id);
      fireEvent.click(screen.getByRole('button', { name: /^yetenekler$/i }));
      expect(screen.getAllByText(/lv 3 gerek/i).length).toBeGreaterThan(0);
    });

    it('locked skill nodes show lock emoji 🔒', () => {
      const lowLevel = COMMANDERS.find((c) => c.level < 5 && c.abilities.length >= 3);
      if (!lowLevel) return;

      renderDetailPage(lowLevel.id);
      fireEvent.click(screen.getByRole('button', { name: /^yetenekler$/i }));
      const lockIcons = screen.getAllByText('🔒');
      expect(lockIcons.length).toBeGreaterThan(0);
    });
  });

  // ── 7. 6 Equipment slots ───────────────────────────────────────────────────

  describe('6 equipment slots', () => {
    it('renders exactly 6 equipment slot buttons', () => {
      renderDetailPage(UNLOCKED_COMMANDER.id);
      fireEvent.click(screen.getByRole('button', { name: /^ekipman$/i }));

      const slotButtons = screen.getAllByRole('button', { name: /slotu/i });
      expect(slotButtons).toHaveLength(SLOT_ORDER.length);
      expect(slotButtons).toHaveLength(6);
    });

    it('SLOT_ORDER has exactly 6 entries', () => {
      expect(SLOT_ORDER).toHaveLength(6);
    });

    it('renders all expected slot types: Silah, Zırh, 3x Aksesuar, Özel', () => {
      renderDetailPage(UNLOCKED_COMMANDER.id);
      fireEvent.click(screen.getByRole('button', { name: /^ekipman$/i }));

      for (const slot of SLOT_ORDER) {
        const meta = SLOT_META[slot];
        expect(screen.getAllByText(meta.label).length).toBeGreaterThan(0);
      }
    });

    it('shows "Silah slotu — boş" aria-label for the weapon slot when unlocked', () => {
      renderDetailPage(UNLOCKED_COMMANDER.id);
      fireEvent.click(screen.getByRole('button', { name: /^ekipman$/i }));
      expect(screen.getByRole('button', { name: /silah slotu — boş/i })).toBeInTheDocument();
    });

    it('slot buttons are enabled for unlocked commanders', () => {
      renderDetailPage(UNLOCKED_COMMANDER.id);
      fireEvent.click(screen.getByRole('button', { name: /^ekipman$/i }));

      const slotButtons = screen.getAllByRole('button', { name: /slotu/i });
      slotButtons.forEach((btn) => {
        expect(btn).not.toBeDisabled();
      });
    });

    it('slot buttons are disabled for locked commanders', () => {
      renderDetailPage(LOCKED_COMMANDER.id);
      fireEvent.click(screen.getByRole('button', { name: /^ekipman$/i }));

      const slotButtons = screen.getAllByRole('button', { name: /slotu/i });
      slotButtons.forEach((btn) => {
        expect(btn).toBeDisabled();
      });
    });

    it('slot buttons for locked commanders have aria-label "kilitli"', () => {
      renderDetailPage(LOCKED_COMMANDER.id);
      fireEvent.click(screen.getByRole('button', { name: /^ekipman$/i }));

      const slotButtons = screen.getAllByRole('button', { name: /slotu — kilitli/i });
      expect(slotButtons).toHaveLength(6);
    });

    it('shows "Özel" badge label on the special slot when unlocked', () => {
      renderDetailPage(UNLOCKED_COMMANDER.id);
      fireEvent.click(screen.getByRole('button', { name: /^ekipman$/i }));

      // The special slot button with aria-label contains "Özel slotu"
      expect(screen.getByRole('button', { name: /özel slotu/i })).toBeInTheDocument();
    });

    it('shows equipment access message for locked commanders', () => {
      renderDetailPage(LOCKED_COMMANDER.id);
      fireEvent.click(screen.getByRole('button', { name: /^ekipman$/i }));
      expect(screen.getByText(/ekipman slotlarına erişmek için/i)).toBeInTheDocument();
    });

    it('shows "slot tıkla" hint message for unlocked commanders', () => {
      renderDetailPage(UNLOCKED_COMMANDER.id);
      fireEvent.click(screen.getByRole('button', { name: /^ekipman$/i }));
      expect(screen.getByText(/bir slota tıklayarak/i)).toBeInTheDocument();
    });
  });

  // ── 8. Equipment attach/detach API call (slot interaction) ────────────────

  describe('equipment slot interaction (attach/detach)', () => {
    it('clicking an equipment slot button does not throw', () => {
      renderDetailPage(UNLOCKED_COMMANDER.id);
      fireEvent.click(screen.getByRole('button', { name: /^ekipman$/i }));

      const slotButtons = screen.getAllByRole('button', { name: /slotu — boş/i });
      expect(slotButtons.length).toBeGreaterThan(0);
      expect(() => fireEvent.click(slotButtons[0])).not.toThrow();
    });

    it('weapon slot shows its icon when empty', () => {
      renderDetailPage(UNLOCKED_COMMANDER.id);
      fireEvent.click(screen.getByRole('button', { name: /^ekipman$/i }));
      expect(screen.getAllByText('⚔️').length).toBeGreaterThan(0);
    });

    it('rarity legend section is visible in the equipment tab', () => {
      renderDetailPage(UNLOCKED_COMMANDER.id);
      fireEvent.click(screen.getByRole('button', { name: /^ekipman$/i }));

      expect(screen.getByText(/nadir seviyeleri/i)).toBeInTheDocument();
      expect(screen.getByText('Sıradan')).toBeInTheDocument();
      expect(screen.getByText('Yaygın')).toBeInTheDocument();
      expect(screen.getByText('Nadir')).toBeInTheDocument();
      expect(screen.getByText('Destansı')).toBeInTheDocument();
      expect(screen.getByText('Efsanevi')).toBeInTheDocument();
    });
  });

  // ── Upgrade panel ──────────────────────────────────────────────────────────

  describe('upgrade panel (Güçlendir tab)', () => {
    it('shows XP progress bar with percent completed text', () => {
      renderDetailPage(UNLOCKED_COMMANDER.id);
      fireEvent.click(screen.getByRole('button', { name: /^güçlendir$/i }));
      expect(screen.getByText(/tamamlandı/i)).toBeInTheDocument();
    });

    it('shows current level number inside upgrade panel', () => {
      renderDetailPage(UNLOCKED_COMMANDER.id);
      fireEvent.click(screen.getByRole('button', { name: /^güçlendir$/i }));
      // The "Seviye" label is inside the level circle of the upgrade panel
      expect(screen.getByText(/^seviye$/i)).toBeInTheDocument();
    });

    it('XP spend button is enabled for unlocked commanders', () => {
      renderDetailPage(UNLOCKED_COMMANDER.id);
      fireEvent.click(screen.getByRole('button', { name: /^güçlendir$/i }));
      expect(
        screen.getByRole('button', { name: /30 xp harca/i })
      ).not.toBeDisabled();
    });

    it('XP spend button is disabled for locked commanders', () => {
      renderDetailPage(LOCKED_COMMANDER.id);
      fireEvent.click(screen.getByRole('button', { name: /^güçlendir$/i }));
      const lockBtn = screen.getByRole('button', { name: /kilidi aç/i });
      expect(lockBtn).toBeDisabled();
    });

    it('spending XP increases the XP display', () => {
      renderDetailPage(UNLOCKED_COMMANDER.id);
      fireEvent.click(screen.getByRole('button', { name: /^güçlendir$/i }));

      const xpButton = screen.getByRole('button', { name: /30 xp harca/i });
      const xpTextBefore = screen.getByText(/\d+ \/ \d+ XP/i).textContent;

      fireEvent.click(xpButton);

      const xpTextAfter = screen.getByText(/\d+ \/ \d+ XP/i).textContent;
      expect(xpTextAfter).not.toEqual(xpTextBefore);
    });

    it('shows milestone rewards section', () => {
      renderDetailPage(UNLOCKED_COMMANDER.id);
      fireEvent.click(screen.getByRole('button', { name: /^güçlendir$/i }));
      expect(screen.getByText(/seviye ödülleri/i)).toBeInTheDocument();
    });

    it('shows level milestones labeled Lv 3, Lv 5, Lv 7, Lv 10', () => {
      renderDetailPage(UNLOCKED_COMMANDER.id);
      fireEvent.click(screen.getByRole('button', { name: /^güçlendir$/i }));

      // Milestone labels use "Lv X" format, scoped to the upgrade panel
      const main = screen.getByRole('main');
      [3, 5, 7, 10].forEach((level) => {
        const matches = within(main).getAllByText(new RegExp(`Lv ${level}`));
        expect(matches.length).toBeGreaterThan(0);
      });
    });
  });

  // ── notFound behavior ──────────────────────────────────────────────────────

  describe('notFound for invalid commander ID', () => {
    it('throws when commander id does not exist', () => {
      expect(() => renderDetailPage('non-existent-id')).toThrow();
    });
  });
});
