#!/usr/bin/env node
/* Comfy sweep — full asset regen for Nebula Dominion.
 *
 * Drives ComfyUI at http://127.0.0.1:8188 with the
 * dreamshaperXL_lightningDPMSDE.safetensors checkpoint (8-step DPM++ SDE
 * Lightning XL).  Generates the five asset families the project needs:
 *
 *   tiles      — 5 races × 6 ages × 3 variants = 90 @ 256² (cropped to
 *                128² on save, flat ambient lighting → tile-safe)
 *   buildings  — 5 races × 6 buildings × 6 ages ≈ 180 @ 1024²
 *                (saved to _orig/; bg-removal runs in a follow-up step)
 *   characters — 4 commanders × 5 races = 20 @ 768×1024 portraits
 *   units      — 5 races × 6 units = 30 @ 512² unit portraits (Marine,
 *                Medic, Sniper, … for the formation roster + /merge cards)
 *   map        — 5 races × 6 ages = 30 @ 1024×512 wide-angle skybox
 *
 * VISUAL DIRECTION — matches the Hikaye Kitabı v1.0 story bible:
 *
 *   "Swallowed Star (Tunshi Xingkong)" donghua-inspired Chinese xianxia +
 *   sci-fi fusion.  NOT western photo-realistic sci-fi.  Anime/donghua
 *   cel-shaded aesthetic, vivid saturated colours, cosmic energy effects,
 *   the universe in the wake of the "Kozmik Yankı" (Cosmic Echo) event
 *   that woke five races simultaneously.
 *
 * Six ages mirror the donghua progression: Star Level → Planetary Level
 * → Star Level (upper) → Universe Level → Domain Lord → Universe Master.
 *
 * Usage:
 *   node scripts/comfy-sweep.mjs              # full sweep, all 4 families
 *   node scripts/comfy-sweep.mjs tiles        # only tiles
 *   node scripts/comfy-sweep.mjs --limit 1 buildings   # one-off smoke
 *
 * The script is sequential because the laptop GPU has only 4 GB VRAM —
 * concurrent Lightning XL jobs OOM.  Each image polled every 800 ms;
 * total wall-time for the full 320-image sweep is ~35-45 min.
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const REPO_ROOT  = path.resolve(__dirname, '..');
const ASSETS     = path.join(REPO_ROOT, 'apps/web/public/assets');

const COMFY = 'http://127.0.0.1:8188';
const CKPT  = 'dreamshaperXL_lightningDPMSDE.safetensors';

/* ── Universal style anchor — anime/donghua aesthetic ──────────────────
 * Drop this prefix into every positive prompt so the whole sweep stays
 * tonally consistent (otherwise Lightning XL drifts into photoreal). */
const DONGHUA_STYLE =
  'anime donghua art style, Chinese xianxia sci-fi fusion, cel-shaded, ' +
  'vibrant saturated colours, dramatic rim light, cosmic energy effects, ' +
  'detailed line art, high quality concept art';

/* ── Race lore (mirrors Hikaye Kitabı Bölüm 3) ─────────────────────────
 * Each race carries its own "Kozmik Yankı yorumu" (Cosmic Echo
 * interpretation) — see story doc §1.2.  The visual style for each race
 * traces back to one of the five donghua archetypes called out in §12.2.
 *
 * NB. `style` is the character/portrait flavour (Genetic Warrior, Beast
 * God, Demon Lord, etc).  `buildingStyle` is the architectural flavour —
 * crucial because if a building prompt inherits "Genetic Warrior armour"
 * Lightning XL produces a mecha standing in front of the camera. The
 * building variant strictly talks about MATERIALS and ARCHITECTURE,
 * never characters, armour, or figures. */

const RACES = {
  insan: {
    // Yutucu Yıldız Hanedanlığı, Genetic Warrior (Luo Feng tarzı)
    style:    'Yutucu Yıldız Dynasty refugees, Luo Feng style Genetic Warrior armour, ' +
              'sleek anime mecha sci-fi, brushed steel and cobalt blue, gold trim, ' +
              'holographic HUD overlays, hopeful Federation aesthetic',
    buildingStyle:
              'Federation military sci-fi architecture, brushed steel and cobalt blue plating, ' +
              'gold trim, antennae and dish arrays, holographic signage, hopeful donghua techno aesthetic',
    paletteByAge: [
      'dusty colonial bronze on barren survivor world',                  // age 1: Gezegensel Uyanış
      'industrial steel blue, first orbital outposts',                   // age 2: Yıldız Sistemi
      'polished chrome and cobalt, interstellar fleet age',              // age 3: Sektör
      'deep cobalt with holo-cyan, Federation banner colours',           // age 4: Galaktik Çatışma
      'royal cobalt with platinum gilding, subspace age',                // age 5: Boyutlar Arası
      'cosmic gold and white, Universe Master radiance',                 // age 6: Kozmik Üstünlük
    ],
    tier9: 'Yutucu Yıldız Varisi (Devouring Star Heir)',
    enemy: 'zerg', motto: 'science, will, brotherhood — three pillars',
  },
  zerg: {
    // Kovan Bilinci, Yutucu Kurt evrim zirvesi
    style:    'Kovan Bilinci hive consciousness biomass, Swallowing Beast / Yutucu Kurt ' +
              'evolutionary apex, organic chitin carapace with bioluminescent veins, ' +
              'magenta and violet ichor, wet glistening surfaces, donghua biotech horror',
    buildingStyle:
              'organic hive architecture, biological chitin structure with bioluminescent veins, ' +
              'magenta and violet ichor dripping, fleshy domes and bone spires, biotech horror building',
    paletteByAge: [
      'swampy ochre flesh, primordial egg cavern',                       // age 1
      'pulsing magenta veins on dark hide, first hive sprawl',           // age 2
      'iridescent violet chitin, bio-ship fleet',                        // age 3
      'deep purple with cyan ichor, swarm-armada scale',                 // age 4
      'royal violet with golden ichor, transcendent forms',              // age 5
      'cosmic gold ichor on obsidian carapace, Devouring Queen aura',    // age 6
    ],
    tier9: 'Yutucu Kraliçe (Devouring Queen)',
    enemy: 'insan', motto: 'evolution, adaptation, hive-mind',
  },
  otomat: {
    // Sonsuzluk Çekirdeği, Cihaz Hazineleri (Treasure Artifacts)
    style:    'Sonsuzluk Çekirdeği logic matrix, Demiurge Prime aesthetic, Cihaz Hazineleri ' +
              'ancient treasure-artifact technology, polished chrome and white ceramic, ' +
              'cyan holographic data rings, geometric perfection, donghua mecha precision',
    buildingStyle:
              'geometric chrome architecture, polished white ceramic panels, cyan holographic data rings, ' +
              'rotating logic spires, ancient treasure-artifact technology building, mathematically perfect structure',
    paletteByAge: [
      'matte titanium grey, awakening ancient ruins',                    // age 1
      'brushed chrome with cyan accents, factory ascendancy',            // age 2
      'mirror-polish white with neon cyan, interstellar logic grid',     // age 3
      'platinum with prismatic holograms, galactic optimisation',        // age 4
      'liquid-mercury chrome with rainbow holograms, subspace logic',    // age 5
      'cosmic white-gold with infinity-fractal halos, Infinite Logic',   // age 6
    ],
    tier9: 'Sonsuz Mantık Demiurge (Infinite Logic Demiurge)',
    enemy: 'canavar', motto: 'logic, optimisation, perfection',
  },
  canavar: {
    // Beast God seviyesi, Black Dragon Mountain estetiği
    style:    'Beast God primordial fury, Black Dragon Mountain ancestor lair, donghua ' +
              'savage tribal stone-and-bone, ember-glow eyes, fur and feather totems, ' +
              'massive lion-beast hybrids with star manes, primal honour',
    buildingStyle:
              'primal tribal architecture, carved stone-and-bone structure, ember-glow torches, ' +
              'fur drapes and feather totems, ancestor-spirit pillars, Black Dragon Mountain stronghold',
    paletteByAge: [
      'weathered grey stone, primordial forest cradle',                  // age 1
      'sandstone with ember glow, first pack territories',               // age 2
      'ochre and bone with hunting-fire pits, sector clans',             // age 3
      'volcanic obsidian with magma seams, galactic pack-empire',        // age 4
      'molten gold with eternal flame, atavar projection age',           // age 5
      'cosmic gold flame on obsidian, Primordial Beast God roar',        // age 6
    ],
    tier9: 'Primordial Canavar Tanrı (Primordial Beast God)',
    enemy: 'otomat', motto: 'the strong rule — natural hierarchy',
  },
  seytan: {
    // Karanlık Mahkeme, Demon Lord seviyesi
    style:    'Karanlık Mahkeme dark court gothic, exiled Demon Lord aesthetic, ' +
              'black-feathered wings and crimson eyes, basalt and obsidian, blood-runes, ' +
              'pact sigils glowing red, dark cathedral spires, donghua demon antagonist',
    buildingStyle:
              'dark gothic cathedral architecture, basalt and obsidian masonry, blood-runes and crimson sigils, ' +
              'tall spires and pointed arches, chained bound walls, donghua demon-court stronghold',
    paletteByAge: [
      'cracked grey basalt, forbidden-dimension exile cell',             // age 1
      'obsidian with dull red runes, first pact rituals',                // age 2
      'polished obsidian with crimson glyphs, Dark Court founded',       // age 3
      'black marble with blood-red veins, galactic dark empire',         // age 4
      'jet black with hellfire crimson and gold, parallel-realm court',  // age 5
      'cosmic black with eternal crimson flame, Infinite Dark Sovereign',// age 6
    ],
    tier9: 'Sonsuz Karanlık Hükümdar (Infinite Dark Sovereign)',
    enemy: 'insan', motto: 'desire, pact, transformation',
  },
};

/* ── Six ages (Hikaye Kitabı §2.1, donghua progression) ───────────────── */
const AGE_MOOD = [
  /* 1 */ 'age 1 Gezegensel Uyanış (Star Level): planetary awakening, primal homeworld, raw beginnings after the Kozmik Yankı',
  /* 2 */ 'age 2 Yıldız Sistemi Hakimiyeti (Planetary Level): orbital infrastructure, first space outposts, twin-planet colonies',
  /* 3 */ 'age 3 Sektör Genişlemesi (Star Level upper): interstellar fleets, sector lord domains, polished mid-game',
  /* 4 */ 'age 4 Galaktik Çatışma (Universe Level): galactic warfare, capital ships, ornate empire-tier detail',
  /* 5 */ 'age 5 Boyutlar Arası Keşif (Domain Lord): subspace rifts, parallel-universe technology, prismatic energy',
  /* 6 */ 'age 6 Kozmik Üstünlük (Universe Master): cosmic transcendence, reality-bending power, divine radiance',
];

const AGE_COUNT = 6;

/* ── Building catalogues (per Hikaye Kitabı §10.2 sacred locations) ───── */

const BUILDINGS = {
  insan: [
    // §10.2: "Yutucu Yıldız Akademisi" + Federation infrastructure
    ['komuta_ussu',      'fortified Federation command bunker with comms array and gold-trim Yutucu Yıldız insignia'],
    ['reaktor_modulu',   'glowing fusion reactor with cooling fins and Genetic Warrior power-conduits'],
    ['yakit_rafinerisi', 'fuel refinery silo with condensation pipes feeding Genetic Warrior armours'],
    ['kisla',            'military barracks for Marine Genetic Warrior trainees, armoured doors and rifle racks'],
    ['bilim_akademisi',  'Yutucu Yıldız Akademisi research dome where Dr. Chen-class scientists train pilots'],
    ['subspace_anteni',  'subspace transmission spire bridging Federation colonies across light years'],
    ['genetik_lab',      'Genetic Warrior bio-engineering lab with cryo capsules and DNA-helix sculptures'],
  ],
  zerg: [
    // §10.2: "Kovan Kalbi" — Vex Thara's egg chamber
    ['kovan_cekirdegi',  'Kovan Kalbi pulsating hive-heart organ, translucent membranes and arterial veins, Vex Thara nucleus'],
    ['biyokutle_havuzu', 'biomass pool with tentacle roots and ichor-dripping rim, biomass-recycling cauldron'],
    ['mutasyon_cukuru',  'Mutasyon Çukuru mutation pit with bone spires and viscous violet ooze'],
    ['genom_tumsegi',    'organic genome mound braided with glowing sinew threads'],
    ['yutucu_tumsek',    'devouring mound with razor-toothed maw, absorbs ancestral Yutucu Kurt energy'],
    ['subspace_damari',  'organic subspace vein gateway pulsing with violet inter-dimensional ichor'],
  ],
  otomat: [
    // §10.2: "Sonsuzluk Çekirdeği" — Demiurge Prime's core
    ['sonsuzluk_cekirdegi','Sonsuzluk Çekirdeği infinity core with rotating holographic data rings, Demiurge Prime nucleus'],
    ['veri_kaynagi',       'data spring server tower with cable bundles and cyan-glow cooling fins'],
    ['hesap_havuzu',       'computation pool with floating circuit boards and quantum-cooled vats'],
    ['montaj_hatti',       'robotic assembly line with overhead arms producing Sentinel and Cataphract units'],
    ['mantik_matrisi',     'Mantık Matrisi logic matrix cube with glowing geometric circuit lattices'],
    ['cihaz_hazinesi',     'Cihaz Hazineleri treasure-artifact vault, ancient creator-tech with neon glyphs'],
    ['subspace_cozucu',    'subspace decoder dish ringed with concentric arrays parsing Domain-Lord signals'],
  ],
  canavar: [
    // §10.2: "Atalar Mağarası" — Black Dragon Mountain analog
    ['alfa_tahti',     'Alfa Tahtı primal throne carved from stone and bone, draped with star-mane pelts'],
    ['av_kampi',       'tribal hunting camp with hide tents and feathered Beast God totems'],
    ['vahsi_cukur',    'savage combat pit scarred with claw marks and trophy bones from beaten challengers'],
    ['atalar_sunagi',  'ancestral altar of stacked skulls and carved runes invoking Beast God spirits'],
    ['atalar_magarasi','Atalar Mağarası ancestor cave entrance, Black Dragon Mountain style totem flanks'],
    ['boyut_yarigi',   'dimensional rift gateway split across primordial rock, atavar projection portal'],
  ],
  seytan: [
    // §10.2: "Karanlık Mahkeme" — Malphas's gothic throne
    ['karanlik_taht', 'Karanlık Taht obsidian throne studded with skull motifs and bound chains, Malphas seat'],
    ['ruh_toplayici', 'soul collector chamber with ghost wisps swirling into capture sigils'],
    ['lanet_tapinagi','cursed temple with floor-set crimson sigils glowing under gothic vaults'],
    ['pakt_sembolu',  'pact sigil pillar inscribed with blood-runes, dark contract focus'],
    ['yasak_grimoire','pedestal holding a floating forbidden grimoire, chained pages flickering with red glyphs'],
    ['yarik_kapisi',  'rift portal doorway bound by heavy chains, gate to the forbidden dimensions'],
  ],
};

/* ── Commander catalogues (per Hikaye Kitabı Bölüm 4) ─────────────────── */

const COMMANDERS = {
  insan: [
    // §4.4 — file paths match apps/web/src/app/commanders/data.ts
    ['voss',    `male commander Aleksander Voss, Yutucu Yıldız Hanedanlığı heir, masculine 30 year old man, short military buzz cut greying hair, scarred jaw, square jawline, masculine face, Luo Feng style Genetic Warrior armour in cobalt and gold, holographic HUD halo, hopeful but battle-worn`],
    ['chen',    `female Dr. Elara Chen, chief scientist, woman in her 50s, intelligent Asian face, white lab coat over Federation uniform, holographic visor, science-pillar archetype`],
    ['reyes',   `male General Marcus Reyes, military commander, masculine 60 year old man, buzz cut grey hair, weathered face, dress uniform with medals, disciplined stoic loyalty`],
    ['kovacs',  `female Lily Phantom Kovacs, intelligence operative, woman in her 30s, sharp angular features, black tactical hood, cybernetic eye implant, mysterious`],
  ],
  zerg: [
    // §4.1
    ['vex_thara',`female Brood Mother Vex Thara, Kovan Bilinci first consciousness, alien queen with chitin crown of curved horns, glowing magenta eyes, translucent membrane robes, insectoid appendages, donghua xianxia queen elegance`],
    ['threnix',  `male Genome Master Threnix, evolution engineer, gaunt male alien figure covered in pulsing veins, holding a writhing genome sample, calm calculating advisor`],
    ['morgath',  `Brain-Worm Mor Gath, last of the Yutucu Kurt species, vast floating brain-creature with neural tendrils and single glowing magenta cyclops eye, tragic strategist, not humanoid`],
    ['kthala',   `female Brood-Aunt Kthala, production lord, hulking female matriarch with multiple egg-laying segments and a regal carapace crown`],
  ],
  otomat: [
    // §4.2
    ['demiurge_prime',`Demiurge Prime, the Infinite Logic, holographic chrome android with halo of rotating data rings, calm symmetrical face, white ceramic robes, donghua mecha priest`],
    ['aurelius',      `Architect Aurelius, structure lord, golden android with engineer-style faceplate, holding a luminous blueprint hologram of ancient creator architecture`],
    ['crucible',      `Algorithmic Knight Crucible, battle commander, heavy combat android in black ceramic armour with cyan accents and tower shield, donghua mecha knight`],
    ['lo_khode',      `Lo-Khode the Data-Engineer, system administrator android, slender multi-arm config and translucent visor`],
  ],
  canavar: [
    // §4.3
    ['khorvash',`Alpha Khorvash, Primordial Canavar Tanrı, towering anthropomorphic lion-beast with golden fire star-mane, carved bone armour, ember-glow amber eyes, donghua Black Dragon Mountain Beast God`],
    ['ulrek',   `Shaman Ulrek, ancestor caller, smaller curved-horn beastman in skull mask and feathered cloak, holding a smoking flame-totem staff`],
    ['ravenna', `Hunt Queen Ravenna, feral catlike huntress with leopard markings, jagged-edge spear, pelts and tribal warpaint, lone hunter sworn to Khorvash`],
    ['korova',  `Korova the Beast-God Cub, primordial young, four-eyed wolf cub with cosmic golden markings, oversized paws, immense latent power`],
  ],
  seytan: [
    // §4.5 — file paths use {malphas, lilithra, vorhaal, azurath}
    ['malphas',  `Dark Lord Malphas, Sonsuz Karanlık Hükümdar, gaunt aristocratic donghua demon-lord, pale ashen skin, ornate black armour with crimson runes, curved horns, black-feathered wings, glowing red eyes, returned exile menace`],
    ['lilithra', `Witch-Queen Lilithra, ritual master, pale-skinned demoness with raven-black hair, blood-red robes, glowing sigil tattoos, eternal rival turned reluctant ally`],
    ['vorhaal',  `Vorhaal the Shadow-Assassin, gizli operasyon uzmanı, hooded faceless wraith with twisted goat horns, only red eye-slits visible, dual cursed daggers`],
    ['azurath',  `Azurath the Pact-Bound debt collector, towering shadowed figure wrapped in chain-bound parchments, faceless except for glowing red eye sockets, antique-trader pose`],
  ],
};

/* ── Unit catalogues — one prompt per (race, unit) ──────────────────────
 *
 * Sources for slug naming + lore (kept in sync by hand):
 *   - apps/game-server/src/units/constants/race-configs.constants.ts
 *     (insan + zerg actually have BE UnitType enum entries; the merge
 *     ladder for insan is reflected here)
 *   - apps/web/src/lib/nd-tokens.ts RACES[*].units  (FE display lex
 *     — drives /merge "Promosyon Töreni" tier ladder labels)
 *   - Hikaye Kitabı v1.0 §10 + §4 (race lore archetypes)
 *
 * Slugs match the BE UnitType enum where one exists; for races whose
 * UnitType rows haven't landed yet (otomat / canavar / seytan are
 * defined in FE lex only) the slug is the romanised FE name, dot-less,
 * underscored. When the BE catalog gains a row for those units the
 * slug *must* match this filename — the FE will read
 * `/assets/units/<race>/<slug>.png` from the matching unit type.
 *
 * Each entry: [slug, prompt-subject]. The prompt-subject describes
 * ONE unit standing on a plain studio backdrop (anti-figure negatives
 * are removed — unlike buildings, units ARE the subject). Tier-implied
 * power is baked into the prompt language (T1 = grunt/initiate,
 * T5 = transcendent / xianxia-cultivator). */
const UNITS = {
  insan: [
    ['marine',          `Marine Federation infantry grunt T1, masculine soldier in cobalt-and-gold combat armour, ` +
                        `glowing helmet visor, gauss rifle held across chest, hopeful Federation Yutucu Yıldız insignia`],
    // Medic + Siege Tank + Ghost are the BE-only trainable insan units
    // (apps/game-server/src/units/constants/race-configs.constants.ts).
    // They aren't in the FE merge-ladder lex but DO render in the
    // formation roster + /merge cards once trained, so they need
    // portraits too.
    ['medic',           `Medic Federation field medic T1, woman in cobalt-and-white combat medic armour with red ` +
                        `cross insignia, healing wand glowing cyan in one hand, sterile visor helmet, calm reassuring stance`],
    ['siege_tank',      `Siege Tank Federation heavy artillery T1, massive cobalt-and-gold tracked tank with twin ` +
                        `long-barrel siege cannons elevated, deployed siege mode stance, Federation insignia on turret`],
    ['ghost',           `Ghost covert operative T1, hooded soldier in stealth-cobalt cloaked armour, glowing red ` +
                        `optical visor, silenced railgun raised, partial cloak shimmer, lethal precision`],
    ['sniper',          `Sniper marksman T2 promoted from three Marines, lean soldier in stealth-grey cobalt armour, ` +
                        `long-barrel railgun across one shoulder, single glowing scope-lens helmet, calm precision`],
    ['engineer',        `Combat Engineer T2, soldier-technician with tool-belt and floating drone companions, ` +
                        `welder gauntlets glowing cyan, blueprint hologram at hip, cobalt-and-gold field uniform`],
    ['mecha_walker',    `Mecha Walker T3 pilot-driven mech, two-legged armoured battle frame with plasma cannon arm, ` +
                        `cockpit visor at chest height, cobalt-and-gold heavy plating, donghua mecha aesthetic`],
    ['genetic_warrior', `Genetic Warrior T4 Luo Feng style gene-tailored super soldier, towering hero in cobalt armour ` +
                        `with gold filigree, glowing veins, holographic HUD halo, cosmic warrior pose`],
    ['captain',         `Field Captain T5 strike-force commander, regal officer in ornate cobalt-and-platinum armour, ` +
                        `cape, glowing tactical overlay, drawn officer's sabre, Federation banner backdrop`],
  ],
  zerg: [
    ['larva',           `Larva Zerg T1 hatchling, small glistening pulsing larva creature, magenta bioluminescence, ` +
                        `chitin segments, primordial spawn-form, biotech horror anime style`],
    ['penceli_avci',    `Pençeli Avcı Zerg T2 claw-hunter, four-legged insectoid stalker with razor scythe claws, ` +
                        `magenta veins on dark chitin, mantis-like head, ichor-glistening hide`],
    ['tuneli_yutan',    `Tüneli Yutan Zerg T2 tunneller, segmented worm-creature with circular fanged maw and ` +
                        `digging mandibles, violet bioluminescent veins, partially emerging from hive ground`],
    ['mutasyon_lord',   `Mutasyon Lord Zerg T3 mutation overlord, humanoid Zerg with multiple arms and pulsating ` +
                        `tumour-growths, magenta-violet chitin crown, evolutionary apex commander`],
    ['mega_lokost',     `Mega Lokost Zerg T4 massive locust beast, towering chitin-armoured colossus with spike ridges, ` +
                        `golden-violet veins, donghua bio-titan, devouring scale`],
    ['beyin_kurt',      `Beyin Kurt Zerg T5 ancient Yutucu Kurt brain-worm transcendent, vast floating brain creature ` +
                        `with neural tendrils and a single cosmic-gold cyclops eye, tragic apex, divine bio-consciousness`],
  ],
  otomat: [
    ['sentinel',        `Sentinel Otomat T1 patrol drone, slender white-ceramic and chrome humanoid robot with cyan ` +
                        `circuit visor, geometric perfection, donghua mecha priest aesthetic`],
    ['drone_operator',  `Drone Operatör Otomat T2 swarm-controller, slim chrome operator with hovering drone halo, ` +
                        `cyan holographic data rings, multi-arm config, calculating composure`],
    ['cataphract',      `Cataphract Otomat T3 heavy battle android, black-ceramic-and-cyan armoured knight with ` +
                        `tower shield and energy lance, geometric crest, donghua mecha cavalry`],
    ['phoenix_komutan', `Phoenix Komutan Otomat T3 aerial commander, golden-chrome winged android with cyan halo, ` +
                        `prismatic logic rings, soaring composure, ancient creator-tech wings`],
    ['yargi_cekirdek',  `Yargı Çekirdek Otomat T4 judgement core, towering android with massive halo of rotating ` +
                        `holographic data rings, faceplate of geometric inscriptions, infinite-logic presence`],
    ['demiurge_birimi', `Demiurge Birimi Otomat T5 transcendent infinite-logic avatar, cosmic white-gold android with ` +
                        `prismatic fractal halo, calm symmetrical face, ceramic robes, divine donghua xianxia mecha`],
  ],
  canavar: [
    ['howler',          `Howler Canavar T1 feral beastling, mid-sized fanged hound-creature with ember-glow eyes, ` +
                        `fur and bone collar, primal stance, Black Dragon Mountain savagery`],
    ['yelmik_avci',     `Yelmik Avcı Canavar T2 swift hunter, lean leopard-spotted beastman with curved bone spear, ` +
                        `tribal warpaint, ember-glow gaze, feline donghua hunter`],
    ['firtina_bogasi',  `Fırtına Boğası Canavar T3 storm-bull, towering minotaur-bull beast with lightning-veined ` +
                        `horns and massive obsidian-hammer fists, magma-glow seams, primal donghua titan`],
    ['ejder_aslani',    `Ejder Aslanı Canavar T4 dragon-lion hybrid, four-eyed lion-beast with serpentine dragon mane ` +
                        `of golden fire, cosmic markings, regal Beast God descendent pose`],
    ['atavar_ruhu',     `Atavar Ruhu Canavar T4 ancestor-spirit projection, translucent ghostly beast-warrior with ` +
                        `feathered totem cloak and ember-glow eyes, ancestral mist, semi-corporeal aura`],
    ['beast_god_yavru', `Beast God Yavru Canavar T5 primordial cub, four-eyed wolf cub with cosmic golden star-mane ` +
                        `markings, oversized paws radiating divine power, infant Universe-Master, awe-inspiring`],
  ],
  seytan: [
    ['imp',             `Imp Şeytan T1 lesser demon, small horned imp with red-rune-burning skin, leathery wings, ` +
                        `glowing crimson eyes, mischievous gothic posture, donghua demon attendant`],
    ['cadi_kalfasi',    `Cadı Kalfası Şeytan T2 witch-apprentice, pale demoness in dark robes with crimson glyph tattoos, ` +
                        `levitating dark grimoire, glowing sigil halo, gothic xianxia witch`],
    ['lanetli_asker',   `Lanetli Asker Şeytan T2 cursed soldier, fallen warrior in obsidian armour bound by glowing ` +
                        `red chains, hollow crimson eye slits in helm, blood-pact aura`],
    ['kanli_lord',      `Kanlı Lord Şeytan T3 blood lord, armoured demon-noble with crimson cape and curved twin blades, ` +
                        `pale aristocratic face, crimson sigil burning behind, gothic demon court`],
    ['kanat_seytani',   `Kanat Şeytanı Şeytan T4 winged demon, fearsome demon-warrior with vast black-feathered wings, ` +
                        `obsidian breastplate inscribed with crimson runes, glowing red eyes, soaring menace`],
    ['demon_lord',      `Demon Lord Şeytan T5 Sonsuz Karanlık Hükümdar transcendent, towering ornate demon-king in ` +
                        `black-and-gold armour, crown of curved horns, eternal crimson flame backdrop, divine dark sovereign`],
  ],
};

/* ── Render specs per family ──────────────────────────────────────────── */

const NEG_BASE =
  'low quality, blurry, deformed, signature, watermark, text, ugly, jpeg artifacts, oversaturated, ' +
  'western realistic photography, 3D render, photoreal';

/* ── Tile material vocabulary (subject-free, race-themed material only) ─
 *
 * Lightning XL has a strong subject bias: anything that smells like a
 * character or "hero" prompt produces a portrait, even with "no character"
 * negatives. So tiles get a totally different prompt shape — pure material
 * photography language ("seamless texture", "macro shot", "PBR material"),
 * the race's signature material instead of its lore, no DONGHUA_STYLE,
 * no character/armour/portrait nouns anywhere. The age palette stays so
 * the colour shifts across the 6-age progression. */
const TILE_MATERIAL = {
  insan:   { ground: 'brushed steel deck plating', blocked: 'reinforced steel bulkhead with rivets', resource: 'titanium ore veins embedded in dark rock' },
  zerg:    { ground: 'organic chitin carapace plating, slick wet biological surface', blocked: 'thick bone bramble wall, knotted sinew', resource: 'pulsating biomass pod cluster, glowing magenta veins' },
  otomat:  { ground: 'polished white ceramic tile grid with cyan circuit traces', blocked: 'crystalline data-shard barricade', resource: 'cyan glowing data crystal cluster on chrome substrate' },
  canavar: { ground: 'rough volcanic stone with cracked dirt and fur tufts', blocked: 'jagged bone barricade and skull pile', resource: 'red blood-crystal cluster jutting from rock' },
  seytan:  { ground: 'cracked obsidian flagstones with faint crimson runes', blocked: 'gothic basalt wall with iron chains', resource: 'cursed ruby shard cluster on black marble' },
};

function tileSpec(race, age, variantIdx) {
  const variants = ['ground', 'blocked', 'resource'];
  const variant  = variants[variantIdx];
  const r        = RACES[race];
  const palette  = r.paletteByAge[age - 1];
  const material = TILE_MATERIAL[race][variant];

  // Age-modulated quality bump: higher ages = richer materials. Stays
  // descriptive about the surface, never about a subject.
  const ageQuality = [
    'rough rugged primitive finish',
    'workshop-grade finish, hand-tooled',
    'industrial-grade refined finish',
    'polished imperial-grade finish, ornate trim',
    'crystalline subspace-grade finish, prismatic shimmer',
    'cosmic divine-grade finish, luminous golden filigree',
  ][age - 1];

  return {
    family: 'tiles',
    name:   variant,
    race, age,
    // Generate at SDXL native 1024² so the model produces sharp, coherent
    // material — at 256² it just makes generic noise. post-process.py
    // downsamples with Lanczos to the final 128² in-game tile size.
    width: 1024, height: 1024,
    positive: [
      `seamless PBR ${material} texture sample, full-bleed edge-to-edge texture`,
      'top-down orthographic flat material sample, macro photography',
      ageQuality,
      palette,
      'even ambient studio lighting, no shadow, no highlight, no rim light, no spotlight',
      'tileable repeating pattern, perfectly flat surface, mobile game floor tile asset',
      'no objects, no figures, no center subject, only continuous material surface filling the frame',
    ].join(', '),
    negative: `${NEG_BASE}, character, person, face, figure, body, portrait, framed, icon, frame, border, edge trim, ornamental border, plate edge, ui element, hero, armour, weapon, robot, creature, monster, helmet, helm, building, structure, vehicle, gem, orb, jewel, center sphere, decorative center, lens flare, directional lighting, shadow, sunlight, spotlight, vignette, rim light, perspective, 3d render, depth, sky, horizon, isometric scene`,
    outPath: path.join(ASSETS, 'tiles', race, `age${age}-${variant}.png`),
  };
}

function buildingSpec(race, slug, subject, age) {
  const r       = RACES[race];
  const palette = r.paletteByAge[age - 1];
  return {
    family: 'buildings',
    name:   slug,
    race, age,
    width: 1024, height: 1024,
    positive: [
      DONGHUA_STYLE,
      `architectural exterior of a ${subject}, ${AGE_MOOD[age - 1]}`,
      r.buildingStyle,      // architecture-only flavour, no character vocab
      palette,
      'three-quarter isometric hero view of a stationary building, centered architectural structure',
      'mobile strategy game building asset, no inhabitants visible',
      'isolated on plain matte black background, solid black backdrop, no scenery',
      'soft even lighting on subject, no harsh shadows',
    ].join(', '),
    // Heavy anti-figure negative — the previous failure mode was Lightning XL
    // reading "Genetic Warrior" / "Beast God" from the race style and
    // producing a mecha/character standing in the centre instead of a
    // building. We now strip those words from the building style AND
    // negate all character/figure language explicitly.
    negative: `${NEG_BASE}, character, person, people, figure, humanoid, biped, robot, mecha, gundam, action figure, head, face, arms, legs, hand, foot, eye, mouth, armour worn, armor worn, warrior, soldier, knight, hero, creature pose, standing pose, complex background, landscape, sky, ground, scenery, multiple buildings, text overlay`,
    outPath: path.join(ASSETS, 'buildings', race, '_orig', `${slug}-age${age}.png`),
  };
}

function characterSpec(race, slug, description) {
  const r = RACES[race];
  return {
    family: 'characters',
    name:   slug,
    race,
    width: 768, height: 1024,
    positive: [
      // Xuanhuan (Chinese mysterious-fantasy) added per user direction —
      // pulls characters toward the donghua/xianxia hero archetype the
      // Hikaye Kitabı evokes (Swallowed Star / Yutucu Kurt lineage,
      // Universe Master / Domain Lord progression). Sharper, more
      // idealised faces, divine cultivator presence.
      DONGHUA_STYLE,
      'xuanhuan cultivation hero aesthetic, mysterious-fantasy character art',
      `portrait of ${description}`,
      r.style,
      'cinematic three-quarter portrait, head and shoulders, dramatic key lighting',
      'plain dark studio backdrop, vignette, no scenery',
      'donghua xianxia hero portrait, painterly digital art, sharp detailed face, expressive eyes, divine cultivator presence',
    ].join(', '),
    negative: `${NEG_BASE}, full body, multiple people, group, weapons in foreground, busy background, landscape, text`,
    outPath: path.join(ASSETS, 'characters', race, `${slug}.png`),
  };
}

function unitSpec(race, slug, description) {
  const r = RACES[race];
  return {
    family: 'units',
    name:   slug,
    race,
    // 512² square: small enough that Lightning XL stays fast (~12s/each
    // with hi-res fix), large enough that the formation roster + /merge
    // cards (typically 64-128px display) downsample cleanly. Same square
    // aspect as commander portraits used elsewhere on /formation.
    width: 512, height: 512,
    positive: [
      DONGHUA_STYLE,
      'xuanhuan cultivation hero aesthetic, mysterious-fantasy character art',
      `portrait of ${description}`,
      r.style,
      // Cinematic single-subject framing — head + chest + a hint of weapon
      // or trademark gear. Same painterly direction as commanders so the
      // formation panel reads as a coherent set, but unit portraits are
      // a touch tighter (less "hero" framing) so a stack of 10 reads as
      // an army not a squad of mini-bosses.
      'cinematic three-quarter unit portrait, head and upper torso, slight low angle, dramatic key lighting',
      'plain dark studio backdrop, vignette, no scenery',
      'donghua xianxia unit portrait, painterly digital art, sharp detailed face, expressive eyes, single subject only',
    ].join(', '),
    negative: `${NEG_BASE}, full body, multiple people, group, crowd, weapons in foreground, busy background, landscape, text, building`,
    outPath: path.join(ASSETS, 'units', race, `${slug}.png`),
  };
}

/* ── Map landmark vocab (environment-only — STRICTLY NO characters or
 *     animals) ────────────────────────────────────────────────────────
 *
 * Mirrors the "planet vista + iconic landmark + multiple celestial bodies
 * in sky" aesthetic the user picked the favorite refs from
 * (canavar/bg-age2, insan/bg-age2, otomat/bg-age6, seytan/bg-age1,
 * zerg/bg-age1). The earlier mapSpec leaked r.style into the prompt
 * which for canavar includes "massive lion-beast hybrids with star
 * manes" — Lightning XL gladly produced lions. Map prompts now NEVER
 * pull from r.style; only this purely-architectural/geographical
 * vocabulary drives the subject.
 *
 * Canavar landmark is intentionally a primal cave + stone-spire
 * mountain formation. NO beasts, NO animals, NO figures — that was the
 * specific user feedback ("aslan olmasın mağara olsun gibi"). */
const MAP_LANDMARK = {
  insan:
    'futuristic Federation orbital colony of cobalt and gold spires rising from cratered plains, ' +
    'holo-lit highways winding to a central command citadel, hopeful Yutucu Yıldız civilisation',
  zerg:
    'vast organic hive-pillar formation of chitinous spires erupting from biomass-coated plains, ' +
    'bioluminescent magenta-violet veins glowing across glistening bone architecture, biotech terrain',
  otomat:
    'geometric chrome megastructure of crystalline ziggurat spires with rotating holographic data rings, ' +
    'cyan circuit veins running through pristine white ceramic plains, ancient creator-tech ruins',
  // STRICTLY environmental — primal cave entrance, jagged stone-spire
  // mountains, ember-glow firepits. NO beasts, NO animals, NO figures
  // anywhere in the prompt. The 'massive lion-beast hybrids' from the
  // canavar style vocab does NOT enter this prompt.
  canavar:
    'massive primal cave entrance carved into towering jagged stone-spire mountains, ' +
    'weathered ancestor totems and ember-glow firepits along cliff terraces, primordial cradle landscape',
  seytan:
    'dark gothic cathedral-spire mountains of basalt and obsidian with crimson sigils carved into the cliffs, ' +
    'pact-rune monoliths and chained gate-pillars rising from cracked volcanic plains, exiled dark court terrain',
};

function mapSpec(race, age) {
  const r       = RACES[race];
  const palette = r.paletteByAge[age - 1];
  // Sky / atmospheric mood — driven only by age progression. Earlier
  // ages keep a more planet-bound feel (multiple moons / dawn sky),
  // late ages dial up the cosmic-energy effects without ever returning
  // to fleet engagement vocabulary (which kept producing capital ships
  // in the foreground).
  const skyByAge = [
    'twin moons and gas-giant low in dawn sky, early planetary awakening',
    'multiple moons and ringed planet at sunset, twin-planet system in the sky',
    'distant star system with multiple celestial bodies, sector-scale sky panorama',
    'huge ringed gas-giant and parallel planets in dramatic atmospheric sky',
    'subspace rift in the upper sky with parallel-universe shimmer and prismatic clouds',
    'cosmic energy currents arcing through the sky, transcendent universe-scale aurora',
  ][age - 1];
  return {
    family: 'map',
    name:   `bg-age${age}`,
    race, age,
    // Square 1024 native — SDXL most-trained resolution, single pass
    // produces crisp matte-painting detail without needing hi-res fix.
    // Earlier rev rendered at 1024×512 + 1.25× hi-res (final 1280×640);
    // user explicitly wants 1024×1024 final.
    width: 1024, height: 1024,
    positive: [
      DONGHUA_STYLE,
      // Subject = landmark + sky. NO r.style line — that's where the
      // canavar lion-beast vocabulary lived. Architecture-only.
      `panoramic planet surface vista of a ${MAP_LANDMARK[race]}`,
      skyByAge,
      palette,
      AGE_MOOD[age - 1],
      'matte painting style environmental concept art, cinematic depth, atmospheric haze, golden hour rim light',
      'empty landscape, no inhabitants visible, distant landmark structure on the horizon, sweeping panoramic backdrop',
    ].join(', '),
    // Heavy anti-figure + anti-animal sweep. The canavar lion problem
    // was Lightning XL inferring beasts from "Beast God primordial fury"
    // in r.style; we no longer use r.style here AND we explicitly
    // negate every animal noun that might creep in from the donghua
    // aesthetic vocab (xianxia art often has spirit beasts).
    negative: `${NEG_BASE}, character, person, people, figure, humanoid, biped, hero, soldier, knight, ` +
              `lion, lion-beast, tiger, wolf, dragon, beast, animal, creature, monster, ` +
              `mecha, robot, warrior, armour worn, ` +
              `ui overlay, text, logo, foreground objects, isometric tiles, ` +
              `capital ship, fleet, spacecraft in foreground`,
    outPath: path.join(ASSETS, 'map', race, `bg-age${age}.png`),
  };
}

/* ── ComfyUI prompt graph (minimal Lightning XL text2img) ─────────────── */

function makeWorkflow({ positive, negative, width, height, seed, hiResFix = false }) {
  // Common base nodes — checkpoint, initial latent, CLIP encoders.
  const wf = {
    '4': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: CKPT } },
    '5': { class_type: 'EmptyLatentImage',       inputs: { width, height, batch_size: 1 } },
    '6': { class_type: 'CLIPTextEncode',         inputs: { text: positive, clip: ['4', 1] } },
    '7': { class_type: 'CLIPTextEncode',         inputs: { text: negative, clip: ['4', 1] } },
    // First-pass sampler. Lightning checkpoint's sweet spot is 4-8 steps;
    // 12 squeezes a touch more coherence on complex compositions
    // (buildings, portraits, panoramas) without the diminishing returns
    // that 16+ produces with this distilled model.
    '3': { class_type: 'KSampler',               inputs: {
      seed, steps: 12, cfg: 2.0,
      sampler_name: 'dpmpp_sde', scheduler: 'karras',
      denoise: 1.0,
      model: ['4', 0], positive: ['6', 0], negative: ['7', 0], latent_image: ['5', 0],
    } },
  };

  if (!hiResFix) {
    // Simple decode + save.
    wf['8'] = { class_type: 'VAEDecode',  inputs: { samples: ['3', 0], vae: ['4', 2] } };
    wf['9'] = { class_type: 'SaveImage',  inputs: { filename_prefix: 'nd-sweep', images: ['8', 0] } };
    return wf;
  }

  // Hi-res fix 2-pass:
  //   1024² first-pass latent  →  Latent upscale 1.5×  →  6-step low-denoise refine  →  decode  →  save
  // The second pass keeps Lightning's dpmpp_sde sampler (same model
  // family, so denoise levels behave consistently) at low denoise
  // (0.4) to preserve the first-pass composition while sharpening
  // detail and tightening anatomy / architecture.
  wf['10'] = { class_type: 'LatentUpscaleBy', inputs: {
    // 1.25× upscale: 1024² → 1280².  On 4 GB VRAM this runs ~3 min
    // per image (vs 1.5× at ~5 min).  Quality bump is still clearly
    // visible vs single-pass; the speed/quality trade-off suits a
    // ~13 h overnight full sweep budget.
    samples: ['3', 0], upscale_method: 'nearest-exact', scale_by: 1.25,
  } };
  wf['11'] = { class_type: 'KSampler',        inputs: {
    seed: seed + 1, steps: 8, cfg: 2.0,
    sampler_name: 'dpmpp_sde', scheduler: 'karras',
    denoise: 0.4,
    model: ['4', 0], positive: ['6', 0], negative: ['7', 0], latent_image: ['10', 0],
  } };
  wf['8']  = { class_type: 'VAEDecode',       inputs: { samples: ['11', 0], vae: ['4', 2] } };
  wf['9']  = { class_type: 'SaveImage',       inputs: { filename_prefix: 'nd-sweep', images: ['8', 0] } };
  return wf;
}

/* ── HTTP helpers ─────────────────────────────────────────────────────── */

async function post(path, body) {
  const res = await fetch(`${COMFY}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status} ${await res.text()}`);
  return res.json();
}

async function getJson(p) {
  const res = await fetch(`${COMFY}${p}`);
  if (!res.ok) throw new Error(`GET ${p} → ${res.status}`);
  return res.json();
}

async function pollPrompt(promptId, timeoutMs = 600_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const history = await getJson(`/history/${promptId}`);
    const entry   = history[promptId];
    if (entry && entry.outputs) return entry;
    await new Promise((r) => setTimeout(r, 800));
  }
  throw new Error(`timeout on promptId ${promptId}`);
}

async function downloadImage({ filename, subfolder, type }, outPath) {
  const qs = new URLSearchParams({ filename, subfolder: subfolder ?? '', type: type ?? 'output' });
  const res = await fetch(`${COMFY}/view?${qs}`);
  if (!res.ok) throw new Error(`download ${filename} → ${res.status}`);
  mkdirSync(path.dirname(outPath), { recursive: true });
  await pipeline(Readable.fromWeb(res.body), createWriteStream(outPath));
}

/* ── Per-spec runner ──────────────────────────────────────────────────── */

let nextSeed = 0xC0FFEE;

async function runSpec(spec, i, total) {
  const tag = `[${String(i).padStart(3, '0')}/${total}] ${spec.family}/${spec.race ?? ''}/${spec.name}${spec.age ? `-age${spec.age}` : ''}`;
  if (existsSync(spec.outPath)) {
    console.log(`${tag} ✓ exists, skip`);
    return;
  }
  const seed = nextSeed++;
  // Tiles downscale to 128 anyway so hi-res fix would just waste time —
  // skip them. Maps render at SDXL-native 1024² and target an exact
  // 1024² output (per user spec) — hi-res 1.25× would produce 1280²
  // instead. Buildings/characters gain the most from the second pass
  // (composition + anatomy/architecture detail).
  const hiResFix = spec.family !== 'tiles' && spec.family !== 'map';
  const wf   = makeWorkflow({ ...spec, seed, hiResFix });
  const t0   = Date.now();
  const { prompt_id } = await post('/prompt', { prompt: wf, client_id: 'nd-sweep' });
  const entry = await pollPrompt(prompt_id);
  const out   = entry.outputs?.['9']?.images?.[0];
  if (!out) throw new Error(`no image in output for ${tag}`);
  await downloadImage(out, spec.outPath);
  // Tile center-crop happens in scripts/post-process.py — keep filename
  // stable; PIL is the right tool for the actual crop rather than
  // pulling sharp into the Node deps.
  console.log(`${tag} ✓ ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

/* ── Build the full spec list ─────────────────────────────────────────── */

function buildAllSpecs(only) {
  const specs = [];

  if (!only || only.has('tiles')) {
    for (const race of Object.keys(RACES))
      for (let age = 1; age <= AGE_COUNT; age++)
        for (let v = 0; v < 3; v++) specs.push(tileSpec(race, age, v));
  }

  if (!only || only.has('buildings')) {
    for (const race of Object.keys(BUILDINGS))
      for (const [slug, subject] of BUILDINGS[race])
        for (let age = 1; age <= AGE_COUNT; age++) specs.push(buildingSpec(race, slug, subject, age));
  }

  if (!only || only.has('characters')) {
    for (const race of Object.keys(COMMANDERS))
      for (const [slug, desc] of COMMANDERS[race]) specs.push(characterSpec(race, slug, desc));
  }

  if (!only || only.has('units')) {
    for (const race of Object.keys(UNITS))
      for (const [slug, desc] of UNITS[race]) specs.push(unitSpec(race, slug, desc));
  }

  if (!only || only.has('map')) {
    for (const race of Object.keys(RACES))
      for (let age = 1; age <= AGE_COUNT; age++) specs.push(mapSpec(race, age));
  }

  return specs;
}

/* ── Entry point ──────────────────────────────────────────────────────── */

async function main() {
  const args = process.argv.slice(2);
  // `--limit N` caps the sweep to the first N specs across whatever
  // families pass the filter — handy for a smoke test before committing
  // to the ~35 min full pass.
  const limitIdx = args.indexOf('--limit');
  let limit = null;
  if (limitIdx >= 0) {
    limit = parseInt(args[limitIdx + 1] ?? '1', 10);
    args.splice(limitIdx, 2);
  }
  const only = args.length ? new Set(args) : null;
  let specs = buildAllSpecs(only);
  if (limit && Number.isFinite(limit)) specs = specs.slice(0, limit);

  console.log(`Sweep: ${specs.length} images — Lightning XL @ ${CKPT}`);
  console.log(`Output root: ${ASSETS}`);
  console.log('');

  const t0 = Date.now();
  let i = 0;
  for (const spec of specs) {
    i++;
    try { await runSpec(spec, i, specs.length); }
    catch (err) {
      console.error(`  ✗ FAILED: ${err.message}`);
      // Continue — one bad prompt shouldn't kill the whole sweep.
    }
  }
  const mins = ((Date.now() - t0) / 60_000).toFixed(1);
  console.log(`\nDone — ${specs.length} specs in ${mins} min`);
}

main().catch((err) => { console.error(err); process.exit(1); });
