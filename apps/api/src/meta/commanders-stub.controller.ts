import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

/* Commander catalog stub.
 *
 * Returns the race-specific commander roster shape that ScrCommanders expects.
 * For now this mirrors the static `RACES[race].commanders` table from the web
 * tokens — the UI was previously reading them directly from race tokens, this
 * endpoint just lets it round-trip through an API instead. */

type RaceKey = 'insan' | 'zerg' | 'otomat' | 'canavar' | 'seytan';

interface Commander {
  id: string;
  name: string;
  title: string;
  race: RaceKey;
  level: number;
  tier: 'BAŞ KOMUTAN' | 'TIER 2' | 'TIER 3' | 'TIER 4' | 'TIER 5';
  skill: string;
  unlocked: boolean;
  portrait: string;
}

const ROSTER: Record<RaceKey, Commander[]> = {
  insan: [
    { id: 'voss',   name: 'Kmt. Aleksander Voss',  title: 'Genetik Savaşçı', race: 'insan', level: 24, tier: 'BAŞ KOMUTAN', skill: 'Tüm filo +12% hasar',          unlocked: true,  portrait: '/assets/characters/insan/voss.png' },
    { id: 'chen',   name: 'Dr. Elara Chen',         title: 'Baş Bilim Adamı', race: 'insan', level: 14, tier: 'TIER 2',      skill: 'Bilim +22%',                   unlocked: true,  portrait: '/assets/characters/insan/chen.png' },
    { id: 'reyes',  name: 'General Marcus Reyes',   title: 'Askeri Komutan',  race: 'insan', level:  9, tier: 'TIER 3',      skill: 'Eğitim hızı +18%',             unlocked: true,  portrait: '/assets/characters/insan/reyes.png' },
    { id: 'kovacs', name: "Lily 'Phantom' Kovacs",  title: 'İstihbarat',      race: 'insan', level:  0, tier: 'TIER 4',      skill: 'KİLİT',                         unlocked: false, portrait: '/assets/characters/insan/kovacs.png' },
  ],
  zerg: [
    { id: 'vex',     name: "Ana Kraliçe Vex'thara", title: 'Kovan Bilinci',     race: 'zerg', level: 24, tier: 'BAŞ KOMUTAN', skill: 'Tüm sürü +14% saldırı',  unlocked: true,  portrait: '/assets/characters/zerg/vex.png' },
    { id: 'threnix', name: 'Genom Üstadı Threnix',  title: 'Evrim Mühendisi',   race: 'zerg', level: 14, tier: 'TIER 3',      skill: 'Mutasyon hızı +28%',     unlocked: true,  portrait: '/assets/characters/zerg/threnix.png' },
    { id: 'morgath', name: "Beyin Kurt Mor'gath",   title: 'Strateji',          race: 'zerg', level:  9, tier: 'TIER 4',      skill: 'AI saldırı puanı +20%',  unlocked: true,  portrait: '/assets/characters/zerg/morgath.png' },
    { id: 'kthala',  name: 'Brood-Anne Kthala',     title: 'Üretim Lordu',      race: 'zerg', level:  0, tier: 'TIER 5',      skill: 'KİLİT',                  unlocked: false, portrait: '/assets/characters/zerg/kthala.png' },
  ],
  otomat: [
    { id: 'prime',    name: 'Demiurge Prime',         title: 'Merkez YZ',       race: 'otomat', level: 24, tier: 'BAŞ KOMUTAN', skill: 'Tüm üretim +10%',    unlocked: true,  portrait: '/assets/characters/otomat/prime.png' },
    { id: 'aurelius', name: 'Mimar Aurelius',         title: 'Yapı Lordu',      race: 'otomat', level: 14, tier: 'TIER 2',      skill: 'İnşaa süresi -22%',  unlocked: true,  portrait: '/assets/characters/otomat/aurelius.png' },
    { id: 'crucible', name: 'Alg. Şövalye Crucible',  title: 'Savaş Komutanı',  race: 'otomat', level:  9, tier: 'TIER 3',      skill: 'Birim hasarı +16%',  unlocked: true,  portrait: '/assets/characters/otomat/crucible.png' },
    { id: 'lokhode',  name: 'Lo-Khode Veri-Mühendis', title: 'Sistem Yönetici', race: 'otomat', level:  0, tier: 'TIER 4',      skill: 'KİLİT',              unlocked: false, portrait: '/assets/characters/otomat/lokhode.png' },
  ],
  canavar: [
    { id: 'khorvash', name: 'Alpha Khorvash',           title: 'Sürü Lideri',  race: 'canavar', level: 24, tier: 'BAŞ KOMUTAN', skill: 'Yakın dövüş +18%',  unlocked: true,  portrait: '/assets/characters/canavar/khorvash.png' },
    { id: 'ulrek',    name: 'Şaman Ulrek',              title: 'Ata Çağrıcı',  race: 'canavar', level: 14, tier: 'TIER 2',      skill: 'Kan Özü +24%',      unlocked: true,  portrait: '/assets/characters/canavar/ulrek.png' },
    { id: 'ravenna',  name: 'Avcı Kraliçe Ravenna',     title: 'Av Lordu',     race: 'canavar', level:  9, tier: 'TIER 3',      skill: 'Av süresi -30%',    unlocked: true,  portrait: '/assets/characters/canavar/ravenna.png' },
    { id: 'korova',   name: 'Korova, Beast-God Yavru',  title: 'Primordial',   race: 'canavar', level:  0, tier: 'TIER 5',      skill: 'KİLİT',             unlocked: false, portrait: '/assets/characters/canavar/korova.png' },
  ],
  seytan: [
    { id: 'malphas',  name: 'Karanlık Lord Malphas',     title: 'Sürgün Lord',   race: 'seytan', level: 24, tier: 'BAŞ KOMUTAN', skill: 'Pakt maliyeti -15%',     unlocked: true,  portrait: '/assets/characters/seytan/malphas.png' },
    { id: 'lilithra', name: 'Cadı-Kraliçe Lilithra',     title: 'Ritüel Ustası', race: 'seytan', level: 14, tier: 'TIER 2',      skill: 'Çağırma süresi -25%',    unlocked: true,  portrait: '/assets/characters/seytan/lilithra.png' },
    { id: 'vorhaal',  name: 'Suikastçı Vorhaal',         title: 'Gölge Bıçak',   race: 'seytan', level:  9, tier: 'TIER 3',      skill: 'Komutan suikast şansı',  unlocked: true,  portrait: '/assets/characters/seytan/vorhaal.png' },
    { id: 'azurath',  name: 'Borç Tahsilcisi Azurath',   title: 'Borç Lordu',    race: 'seytan', level:  0, tier: 'TIER 4',      skill: 'KİLİT',                  unlocked: false, portrait: '/assets/characters/seytan/azurath.png' },
  ],
};

const isRaceKey = (v: unknown): v is RaceKey =>
  typeof v === 'string' && (v === 'insan' || v === 'zerg' || v === 'otomat' || v === 'canavar' || v === 'seytan');

@ApiTags('commanders (stub)')
@Controller('commanders')
export class CommandersStubController {
  @Get()
  @ApiOperation({ summary: 'List commanders, optionally filtered by race' })
  @ApiQuery({ name: 'race', required: false, enum: ['insan', 'zerg', 'otomat', 'canavar', 'seytan'] })
  list(@Query('race') race?: string) {
    if (race && isRaceKey(race)) return ROSTER[race];
    // Return everyone, flattened, when no filter is given.
    return (Object.keys(ROSTER) as RaceKey[]).flatMap((k) => ROSTER[k]);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get commander detail by id' })
  byId(@Param('id') id: string) {
    for (const race of Object.keys(ROSTER) as RaceKey[]) {
      const found = ROSTER[race].find((c) => c.id === id);
      if (found) return found;
    }
    return { id, found: false };
  }
}
