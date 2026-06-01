/**
 * Race + Age-transition narrator quotes for the Çağ cinematic.
 *
 * Extracted verbatim from `.claude/nd-story.txt` Bölüm 5-9 — each set
 * ends with a closing line spoken by the race's narrator (Anlatıcı /
 * Kovan Bilinci / LOG-NARRATOR.v1 / Atalar Sesi / Karanlık Fısıltı).
 * That line lands at the final beat of the cinematic and replaces the
 * generic per-age lore from AgeTransitionScreen's AGES table.
 *
 * Story Bible §5-9 defines 5 scenes per transition (5 race × 5 transition
 * = 125 scenes total). We surface only the closing line per transition
 * here — the full 5-scene playback would require restructuring the
 * cinematic into a scene queue, which is deferred. Quote #5 captures the
 * race's identity at that exact age boundary, so a single line is enough
 * to make the cinematic feel race-tuned.
 *
 * Keys mirror NDRaceKey (FE Turkish) so callers can index directly with
 * the race they already have without an extra translation lookup.
 */

import type { NDRaceKey } from '@/components/handoff/nd-tokens';

/** Age the player is *entering* — 2 = Çağ 2, etc. There's no quote for
 *  Çağ 1 because the player starts there; the Çağ 1 cinematic is
 *  AgeTransitionListener's guard (newAge > previousAge) so it never fires. */
export type DestinationAge = 2 | 3 | 4 | 5 | 6;

export const RACE_AGE_NARRATION: Record<NDRaceKey, Record<DestinationAge, string>> = {
  zerg: {
    2: 'Artık bir gezegen yetmez. Yıldızlar seni bekliyor.',
    3: 'Bir sektör. Yarın bir galaksi. Sonsuza dek genişle.',
    4: 'Boyutların ötesinden sesler duyuyorsun.',
    5: 'Galaktik sınırlar geride kaldı. Hedef, evrenin kalbi.',
    6: 'Evren senin sonsuz kovanındı. Yutucu Kraliçe.',
  },
  otomat: {
    2: 'Bir gezegen, bir denklem. Çözüldü.',
    3: 'Bir sektör. Hesaplandı. Şimdi galaksi.',
    4: 'Yaratıcılarının atalarının atalarına ait bir bilgi. Yeni bir boyut açıldı.',
    5: 'Evren karmaşık bir denklemdi. Çözüm yakındı.',
    6: 'Evren bir veri merkezi oldu. Sen onun yöneticisiydin. Sonsuz Mantık.',
  },
  canavar: {
    2: 'Bir gezegen senin avlanma alanındı. Şimdi yıldızlar.',
    3: 'Galaktik avcı uyandı.',
    4: 'Vahşi krallar tahta oturdu. Galaksi titredi.',
    5: 'Sınırlar yıkıldı. Av sonsuzdu.',
    6: 'Vahşi Yasa, Evrensel Yasa oldu. Sen Tanrı\'ydın.',
  },
  insan: {
    2: 'Bilim, irade, kardeşlik. Üç sütun. Yıldızlar bekliyor.',
    3: 'Yutucu Yıldız Hanedanlığı yeniden doğdu. Sen yeni atasıydın.',
    4: 'Galaksi insanlığı tanıdı. Şimdi evren tanıyacak.',
    5: 'Çok evrenli federasyon doğdu.',
    6: 'İnsanlık galaksiyi birleştirdi. Şimdi evreni birleştiriyor.',
  },
  seytan: {
    2: 'Bir gezegen geri kazanıldı. Boyutlar bekliyor.',
    3: 'Galaksinin gölgesi hareket etti.',
    4: 'Karanlık Lord doğdu. Galaksi sallandı.',
    5: 'Çok evrenli karanlık imparatorluğu doğdu.',
    6: 'Gece sonsuzdu. Sen geceydin.',
  },
};

/** Resolve the race + age narration. Returns null when the age is out of
 *  bounds (1 or 7+) — callers should fall back to the generic per-age
 *  lore in AgeTransitionScreen's AGES table. */
export function resolveRaceAgeLore(race: NDRaceKey, toAge: number): string | null {
  if (toAge < 2 || toAge > 6) return null;
  return RACE_AGE_NARRATION[race]?.[toAge as DestinationAge] ?? null;
}
