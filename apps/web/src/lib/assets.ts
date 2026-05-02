export const CHARACTER_ASSETS = {
  zerg: {
    vex_thara: '/assets/characters/zerg/vex_thara.png',
    morgath: '/assets/characters/zerg/morgath.png',
    threnix: '/assets/characters/zerg/threnix.png',
  },
  otomat: {
    demiurge_prime: '/assets/characters/otomat/demiurge_prime.png',
    aurelius: '/assets/characters/otomat/aurelius.png',
    crucible: '/assets/characters/otomat/crucible.png',
  },
  canavar: {
    khorvash: '/assets/characters/canavar/khorvash.png',
    ravenna: '/assets/characters/canavar/ravenna.png',
    ulrek: '/assets/characters/canavar/ulrek.png',
  },
  insan: {
    voss: '/assets/characters/insan/voss.png',
    chen: '/assets/characters/insan/chen.png',
    reyes: '/assets/characters/insan/reyes.png',
    kovacs: '/assets/characters/insan/kovacs.png',
  },
  seytan: {
    malphas: '/assets/characters/seytan/malphas.png',
    lilithra: '/assets/characters/seytan/lilithra.png',
    vorhaal: '/assets/characters/seytan/vorhaal.png',
    azurath: '/assets/characters/seytan/azurath.png',
  },
} as const;

export const STRUCTURE_ASSETS = {
  atalar_magarasi: '/assets/structures/atalar_magarasi.png',
  karanlik_mahkeme: '/assets/structures/karanlik_mahkeme.png',
  kovan_kalbi: '/assets/structures/kovan_kalbi.png',
  lanet_tapinagi: '/assets/structures/lanet_tapinagi.png',
  mutasyon_cukuru: '/assets/structures/mutasyon_cukuru.png',
  sonsuzluk_cekirdegi: '/assets/structures/sonsuzluk_cekirdegi.png',
  yutucu_tumsegi: '/assets/structures/yutucu_tumsegi.png',
  yutucu_yildiz_akademisi: '/assets/structures/yutucu_yildiz_akademisi.png',
} as const;

export type RaceAssetKey = keyof typeof CHARACTER_ASSETS;
export type StructureAssetKey = keyof typeof STRUCTURE_ASSETS;
