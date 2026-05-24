/**
 * Backend error → Turkish translator.
 *
 * Both api and game-server throw NestJS exceptions with English `.message`
 * strings (e.g. `BadRequestException("Maximum 1 command_center buildings
 * allowed per player.")`). The UI is Turkish, so dropping the raw English
 * into a toast looks broken.
 *
 * Strategy: keep the backend canonical (English, locale-agnostic, easier
 * to grep / log / Sentry-group), and translate at the boundary — here,
 * inside the fetch wrapper. Every FetchError.message goes through
 * `translateBackendError()` before reaching `toast.error(...)`.
 *
 * Pattern coverage: known phrases get pretty Turkish; unknown English
 * messages fall through unchanged so we never swallow useful diagnostics.
 * Add new patterns here as backend exceptions grow — one shared map
 * beats touching dozens of service files.
 */

/* ── Building type code → human-readable Turkish ─────────────────────── */

const BUILDING_TYPE_TR: Record<string, string> = {
  command_center:    'Komuta Üssü',
  mineral_extractor: 'Mineral Çıkarıcı',
  gas_refinery:      'Gaz Rafinerisi',
  solar_plant:       'Enerji Santrali',
  barracks:          'Kışla',
  academy:           'Akademi',
  factory:           'Fabrika',
  spawning_pool:     'Üretim Havuzu',
  hatchery:          'Kuluçka',
  nano_forge:        'Nano Dökümhane',
  cyber_core:        'Siber Çekirdek',
  quantum_reactor:   'Kuantum Reaktör',
  defense_matrix:    'Savunma Matrisi',
  repair_drone_bay:  'Tamir Drone Hangarı',
  shield_generator:  'Kalkan Jeneratörü',
  turret:            'Burç',
};

function trBuildingType(code: string): string {
  return BUILDING_TYPE_TR[code] ?? code;
}

/* ── Pattern map ─────────────────────────────────────────────────────── */

interface Rule {
  /** Regex matched against the raw English message. */
  re: RegExp;
  /** Producer takes the regex match and returns the Turkish replacement. */
  tr: (m: RegExpMatchArray) => string;
}

const RULES: Rule[] = [
  /* Buildings — start-construction limits */
  {
    re: /^Maximum (\d+) (\w+) buildings? allowed per player\.?$/,
    tr: (m) => `En fazla ${m[1]} ${trBuildingType(m[2])} inşa edebilirsin.`,
  },
  {
    re: /^Position \((-?\d+), (-?\d+)\) is already occupied\.?$/,
    tr: (m) => `(${m[1]}, ${m[2]}) konumu zaten dolu.`,
  },
  {
    re: /^Insufficient resources\. Required: (\d+)M (\d+)G (\d+)E$/,
    tr: (m) => `Yetersiz kaynak. Gerekli: ${m[1]} mineral, ${m[2]} gaz, ${m[3]} enerji.`,
  },
  {
    re: /^Building ([\w-]+) not found for player ([\w-]+)\.?$/,
    tr: () => 'Yapı bulunamadı.',
  },
  {
    re: /^Building ([\w-]+) is already destroyed\.?$/,
    tr: () => 'Bu yapı zaten yıkılmış.',
  },
  { re: /^Cannot destroy Command Center\.?$/, tr: () => 'Komuta Üssü yıkılamaz.' },

  /* Auth */
  { re: /^Missing authentication token$/i, tr: () => 'Giriş yapman lazım.' },
  { re: /^Invalid or expired token$/i,     tr: () => 'Oturumun süresi doldu. Tekrar giriş yap.' },
  { re: /^Admin role required$/i,          tr: () => 'Bu işlem yönetici yetkisi gerektirir.' },
  { re: /^Unauthorized$/i,                 tr: () => 'Yetkisiz işlem.' },
  { re: /^Forbidden(?: resource)?$/i,      tr: () => 'Bu işleme yetkin yok.' },

  /* Guilds / alliance */
  { re: /^User [\w-]+ is already in a guild$/, tr: () => 'Zaten bir ittifaktasın.' },
  { re: /^Guild tag '([^']+)' is already taken$/, tr: (m) => `'${m[1]}' ittifak etiketi zaten alınmış.` },
  { re: /^Guild name '([^']+)' is already taken$/, tr: (m) => `'${m[1]}' ittifak adı zaten alınmış.` },
  { re: /^Guild ([\w-]+) not found$/,          tr: () => 'İttifak bulunamadı.' },
  { re: /^User [\w-]+ is not in guild [\w-]+$/, tr: () => 'Bu ittifakta üye değilsin.' },
  { re: /^User [\w-]+ is not a member of guild [\w-]+$/, tr: () => 'Bu ittifakta üye değilsin.' },
  { re: /^Only leader or officer may start research$/, tr: () => 'Sadece lider veya subay araştırma başlatabilir.' },
  { re: /^Selector is not a member of this guild$/, tr: () => 'Bu ittifakta üye değilsin.' },
  { re: /^Contributor is not a member of this guild$/, tr: () => 'Bu ittifakta üye değilsin.' },

  /* Raids / research */
  { re: /^Raid ([\w-]+) not found$/, tr: () => 'Raid bulunamadı.' },
  { re: /^Raid is (\w+), not active$/, tr: () => 'Raid aktif değil.' },
  { re: /^Drops only resolve for completed raids$/, tr: () => 'Ödüller sadece tamamlanan raidlerde dağıtılır.' },
  { re: /^Research state [\w-]+ not found$/, tr: () => 'Araştırma durumu bulunamadı.' },
  { re: /^Research is (\w+), not researching$/, tr: () => 'Araştırma şu an aktif değil.' },
  { re: /^Unknown research id: ([\w-]+)$/, tr: () => 'Bilinmeyen araştırma.' },

  /* Validation primitives */
  { re: /^damage must be > 0$/i, tr: () => 'Hasar değeri 0\'dan büyük olmalı.' },
  { re: /^xp must be > 0$/i,     tr: () => 'TP değeri 0\'dan büyük olmalı.' },
  { re: /^Age must be between 1 and 6, got: (\d+)$/, tr: () => 'Çağ değeri 1-6 arasında olmalı.' },

  /* Generic fallback prefix for unknown 4xx/5xx */
  { re: /^API error: \d+ (.+)$/, tr: () => 'Sunucu hatası, lütfen tekrar dene.' },
  { re: /^Game-server error: \d+ (.+)$/, tr: () => 'Oyun sunucusu hatası, lütfen tekrar dene.' },
];

/**
 * Try to translate `msg` to Turkish. Falls through to the original
 * English when no rule matches — better to show useful diagnostics
 * than a useless "Sunucu hatası" wall.
 */
export function translateBackendError(msg: string): string {
  if (!msg) return 'Bilinmeyen hata.';
  for (const rule of RULES) {
    const m = msg.match(rule.re);
    if (m) return rule.tr(m);
  }
  return msg;
}
