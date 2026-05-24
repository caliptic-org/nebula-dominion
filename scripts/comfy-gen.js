/* Generate building art via the local ComfyUI API.
 *
 * Submits a SD1.5 text-to-image workflow per (race, building) pair, polls the
 * queue, then downloads the resulting PNG into apps/web/public/assets/buildings/.
 *
 * Usage:
 *   node scripts/comfy-gen.js insan komuta_ussu "isometric dark sci-fi command center, manga, neon, cyberpunk"
 *
 * Or run the full sweep:
 *   node scripts/comfy-gen.js --all
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const COMFY = 'http://127.0.0.1:8188';
const OUTPUT_DIR = path.resolve(__dirname, '..', 'apps/web/public/assets/buildings');

/* ── Building catalog (mirrors RACES[*].buildings in nd-tokens) ─────────── */

const BUILDINGS = {
  insan: [
    { slug: 'komuta_ussu',      name: 'Komuta Üssü',     subject: 'futuristic command center bunker' },
    { slug: 'reaktor_modulu',   name: 'Reaktör Modülü',  subject: 'glowing fusion reactor module with cooling fins' },
    { slug: 'kisla',            name: 'Kışla',           subject: 'military barracks with armored doors' },
    { slug: 'bilim_akademisi',  name: 'Bilim Akademisi', subject: 'research lab with antenna and dish' },
    { slug: 'subspace_anteni',  name: 'Subspace Anteni', subject: 'subspace transmission tower with dish array' },
    { slug: 'genetik_lab',      name: 'Genetik Lab',     subject: 'bio-engineering lab with green glow capsules' },
  ],
  zerg: [
    { slug: 'kovan_cekirdegi',  name: 'Kovan Çekirdeği', subject: 'organic hive heart pulsating with veins' },
    { slug: 'biyokutle_havuzu', name: 'Biyokütle Havuzu', subject: 'pool of biomass with tentacle roots' },
    { slug: 'mutasyon_cukuru',  name: 'Mutasyon Çukuru',  subject: 'mutation pit with bone spires and ooze' },
    { slug: 'genom_tumsegi',    name: 'Genom Tümseği',    subject: 'organic genome mound with sinew threads' },
    { slug: 'yutucu_tumsek',    name: 'Yutucu Tümsek',    subject: 'devouring mound with razor teeth opening' },
    { slug: 'subspace_damari',  name: 'Subspace Damarı',  subject: 'organic subspace vein gateway' },
  ],
  otomat: [
    { slug: 'sonsuzluk_cekirdegi', name: 'Sonsuzluk Çekirdeği', subject: 'cybernetic core with holographic data rings' },
    { slug: 'veri_kaynagi',        name: 'Veri Kaynağı',         subject: 'data spring server tower with cables' },
    { slug: 'montaj_hatti',        name: 'Montaj Hattı',         subject: 'robotic assembly line with conveyor' },
    { slug: 'mantik_matrisi',      name: 'Mantık Matrisi',       subject: 'logic matrix cube with glowing circuits' },
    { slug: 'cihaz_hazinesi',      name: 'Cihaz Hazinesi',       subject: 'cybernetic relic vault with neon glyphs' },
    { slug: 'subspace_cozucu',     name: 'Subspace Çözücü',      subject: 'subspace decoder dish with rings' },
  ],
  canavar: [
    { slug: 'alfa_tahti',     name: 'Alfa Tahtı',     subject: 'primal throne carved from stone and bone' },
    { slug: 'av_kampi',       name: 'Av Kampı',        subject: 'tribal hunting camp with tents and totems' },
    { slug: 'vahsi_cukur',    name: 'Vahşi Çukur',      subject: 'savage pit with claw marks and bones' },
    { slug: 'atalar_sunagi',  name: 'Atalar Sunağı',    subject: 'ancestral altar with skulls and runes' },
    { slug: 'atalar_magarasi',name: 'Atalar Mağarası',  subject: 'ancestor cave entrance with totems' },
    { slug: 'boyut_yarigi',   name: 'Boyut Yarığı',     subject: 'dimensional rift gateway in rock' },
  ],
  seytan: [
    { slug: 'karanlik_taht',  name: 'Karanlık Taht',   subject: 'dark throne with skull motifs and chains' },
    { slug: 'ruh_toplayici',  name: 'Ruh Toplayıcı',   subject: 'soul collector chamber with ghost wisps' },
    { slug: 'lanet_tapinagi', name: 'Lanet Tapınağı',  subject: 'cursed temple with sigil floors' },
    { slug: 'pakt_sembolu',   name: 'Pakt Sembolü',    subject: 'pact sigil pillar with magic runes' },
    { slug: 'yasak_grimoire', name: 'Yasak Grimoire',  subject: 'forbidden grimoire pedestal with floating book' },
    { slug: 'yarik_kapisi',   name: 'Yarık Kapısı',    subject: 'rift portal door with chains' },
  ],
};

const STYLE_BY_RACE = {
  insan:   'sleek military sci-fi, blue neon highlights, brushed steel, holographic UI overlays',
  zerg:    'organic biomass alien, magenta neon veins, chitin armor, wet glistening surfaces',
  otomat:  'cybernetic geometric, cyan neon circuits, polished chrome, holographic data flow',
  canavar: 'primal tribal stone, orange ember glow, bone and fur, rugged textures',
  seytan:  'dark occult demonic, red glowing runes, basalt and obsidian, smoke wisps',
};

/* ── Per-age base background scenes ───────────────────────────────────────
 * Each (race, age) pair gets a wide landscape used as the /base screen
 * backdrop. Ages 1..6 mirror the tier progression in apps/api: each age
 * advances the player's empire visually (early outpost → galactic capital). */

const BASE_AGES = [
  { age: 1, eraTag: 'gezegensel uyanış',    insan: 'dusty colonial outpost on a barren planet',                zerg: 'nascent biomass nest in a misty swamp',                   otomat: 'minimal data node on a metallic mesa',                  canavar: 'wild tribal camp at the edge of a primal forest',       seytan: 'cracked obsidian shrine in a charred valley' },
  { age: 2, eraTag: 'genişleme çağı',        insan: 'expanding colony with reactor towers and roads',           zerg: 'growing hive complex with veined organic spires',         otomat: 'data network cluster with cyan light arrays',          canavar: 'established beast clan settlement among standing stones', seytan: 'ritual citadel built into a basalt cliff' },
  { age: 3, eraTag: 'endüstri',              insan: 'industrial metropolis with mecha cranes and ships',        zerg: 'sprawling hive ecosystem covering hills',                 otomat: 'precision factory grid stretching to horizon',         canavar: 'fortified tribal kingdom with bone watchtowers',        seytan: 'demonic temple complex with floating ritual platforms' },
  { age: 4, eraTag: 'ileri çağ',             insan: 'advanced federation capital with skyhook elevators',       zerg: 'evolved brood city pulsing with bioluminescence',         otomat: 'gleaming chrome megacity with neural data streams',    canavar: 'colossal beast god ziggurat dominating the wilds',      seytan: 'infernal court tower piercing storm clouds' },
  { age: 5, eraTag: 'subspace',              insan: 'orbital fortress with subspace gateway in the sky',        zerg: 'galactic brood spreading across asteroid fields',         otomat: 'computational singularity tower piercing dimensions',  canavar: 'cosmic primal sanctuary on a floating monolith',        seytan: 'eldritch dark mahkeme floating between dimensions' },
  { age: 6, eraTag: 'galaktik',              insan: 'galactic federation capital orbiting a star',              zerg: 'cosmic devourer brood enveloping a planet',                otomat: 'universe-scale optimum geometric infinity engine',     canavar: 'wild hierarchy throne on a cosmic primordial peak',     seytan: 'eternal dark court enthroned among burning galaxies' },
];

const NEGATIVE_PROMPT =
  // Suppress interior-shot bias + UI clutter + humans.
  'interior view, room interior, inside view, indoors, furniture, chairs, desk, monitors, screens, ' +
  'people, person, human figure, character, hands, ' +
  'text, words, watermark, signature, logo, UI, hud, ' +
  'multiple objects, cluttered scene, perspective lines, grid lines, ' +
  'blurry, low quality, jpeg artifacts, oversaturated, distorted, deformed';

/* ── ComfyUI workflow ───────────────────────────────────────────────────── */

/* SDXL Lightning workflow — generates at native 1024×1024 then downscales to
 * 512×512 via ImageScale (per user's ≤512 constraint). Lightning variants
 * converge in 4–8 steps with dpmpp_sde + karras at low CFG (1.5–2.0). */
function buildWorkflow(positivePrompt, negativePrompt, seed) {
  return {
    "3": {
      class_type: "KSampler",
      inputs: {
        seed,
        steps: 8,
        cfg: 2,
        sampler_name: "dpmpp_sde",
        scheduler: "karras",
        denoise: 1,
        model: ["4", 0],
        positive: ["6", 0],
        negative: ["7", 0],
        latent_image: ["5", 0],
      },
    },
    "4": {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: "dreamshaperXL_lightningDPMSDE.safetensors" },
    },
    "5": {
      class_type: "EmptyLatentImage",
      // SDXL is trained at 1024×1024; render native, downscale later. Smaller
      // latents (e.g. 512×512 SDXL) collapse anatomy and detail.
      inputs: { width: 1024, height: 1024, batch_size: 1 },
    },
    "6": {
      class_type: "CLIPTextEncode",
      inputs: { text: positivePrompt, clip: ["4", 1] },
    },
    "7": {
      class_type: "CLIPTextEncode",
      inputs: { text: negativePrompt, clip: ["4", 1] },
    },
    "8": {
      class_type: "VAEDecode",
      inputs: { samples: ["3", 0], vae: ["4", 2] },
    },
    "10": {
      class_type: "ImageScale",
      // Downscale 1024 → 512 via lanczos so the saved asset honours the
      // ≤512 budget without losing detail to small-latent generation.
      inputs: {
        image: ["8", 0],
        upscale_method: "lanczos",
        width: 512,
        height: 512,
        crop: "disabled",
      },
    },
    "9": {
      class_type: "SaveImage",
      inputs: { filename_prefix: "nebula", images: ["10", 0] },
    },
  };
}

/* ── HTTP helpers (no external deps, just node:http) ────────────────────── */

function request(opts, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        if (res.statusCode >= 200 && res.statusCode < 300) resolve({ buf, headers: res.headers });
        else reject(new Error(`HTTP ${res.statusCode}: ${buf.toString().slice(0, 200)}`));
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function postJSON(p, body) {
  const json = JSON.stringify(body);
  const { buf } = await request(
    {
      hostname: '127.0.0.1',
      port: 8188,
      path: p,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(json) },
    },
    json,
  );
  return JSON.parse(buf.toString());
}

async function getJSON(p) {
  const { buf } = await request(
    { hostname: '127.0.0.1', port: 8188, path: p, method: 'GET' },
  );
  return JSON.parse(buf.toString());
}

async function getFile(p) {
  const { buf } = await request(
    { hostname: '127.0.0.1', port: 8188, path: p, method: 'GET' },
  );
  return buf;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ── One image generation cycle ─────────────────────────────────────────── */

async function generateOne(race, slug, subject) {
  return generateBuilding(race, slug, subject);
}

async function generateBuilding(race, slug, subject) {
  const style = STYLE_BY_RACE[race];
  const positive = [
    // Lead with the camera + composition framing so SDXL doesn't drift to
    // interior shots. "exterior" + "3/4 view" + "single structure" anchor it.
    'isometric 3D game asset, 3/4 view from above, exterior shot of a single building',
    `subject: ${subject}`,
    'standalone structure on a small dark base platform, centered, full building visible',
    'video game base-builder strategy asset, RTS unit icon style',
    `nebula dominion: dark sci-fi manga aesthetic, ${style}`,
    'dramatic rim lighting, deep shadows, clean dark background, no scene clutter',
    'highly detailed concept art, sharp focus, octane render quality',
  ].join(', ');

  return runAndSave(positive, OUTPUT_DIR, race, slug);
}

/* Generate a wide base-screen backdrop for (race, age). Saved under
 * apps/web/public/assets/bases/<race>/age-<n>.png */
async function generateBase(race, age) {
  const ageDef = BASE_AGES.find((a) => a.age === age);
  if (!ageDef) throw new Error(`Unknown age ${age}`);
  const scene = ageDef[race];
  if (!scene) throw new Error(`No scene for ${race}/age${age}`);
  const style = STYLE_BY_RACE[race];

  const positive = [
    // Landscape framing — backdrop, not iso building.
    'wide cinematic landscape vista, sweeping panoramic view, low horizon line',
    `subject: ${scene}`,
    'environment background art, no characters, no text',
    `era: ${ageDef.eraTag} (age ${age} of 6) — visual maturity scales with age`,
    `nebula dominion: dark sci-fi manga aesthetic, ${style}`,
    'atmospheric perspective, volumetric god rays, moody fog, deep cinematic shadows',
    'highly detailed matte painting, sharp focus, dramatic composition, concept art',
  ].join(', ');

  const slug = `age-${age}`;
  const dir = path.resolve(__dirname, '..', 'apps/web/public/assets/bases');
  return runAndSave(positive, dir, race, slug);
}

const BASES_OUTPUT_DIR = path.resolve(__dirname, '..', 'apps/web/public/assets/bases');
const TILES_OUTPUT_DIR = path.resolve(__dirname, '..', 'apps/web/public/assets/tiles');
const CHARACTERS_OUTPUT_DIR = path.resolve(__dirname, '..', 'apps/web/public/assets/characters');

/* ── Commander portrait generation ────────────────────────────────────────
 * Each commander gets a 1024×1024 manga-style bust shot. Used by /commanders
 * detail page + /commanders list cards. Naming: <race>/<slug>.png. Backed
 * by the same dreamshaperXL_lightningDPMSDE workflow, but the prompt asks
 * for a portrait composition instead of an iso building. */

async function generateCommander(race, slug, subject) {
  const style = STYLE_BY_RACE[race];
  const positive = [
    'character portrait, bust shot from chest up, looking at camera',
    `subject: ${subject}`,
    'manga / anime cinematic style, dramatic lighting, sharp focus',
    'dark background with subtle race-themed atmospheric haze',
    `nebula dominion: dark sci-fi manga aesthetic, ${style}`,
    'highly detailed character design, expressive eyes, race-appropriate armor or attire',
    'centered composition, no text or watermark, single figure only',
  ].join(', ');
  return runAndSave(positive, CHARACTERS_OUTPUT_DIR, race, slug);
}

/* ── Per-race iso ground tile sprites ─────────────────────────────────────
 * One pre-projected diamond tile per race used as the BaseField ground.
 * Each render is a 1024×512 transparent PNG containing a single isometric
 * diamond (2:1 ratio) of the race's terrain — clean metal plating for
 * Insan, organic biomass for Zerg, etc. The web renderer (BaseField) drops
 * it into an SVG <image> at every (col,row) on the 12×8 grid, so the
 * tilemap reads as photoreal terrain instead of flat colours.
 *
 * Naming: <race>/ground.png. Later we can add age-/terrain-type variants
 * (e.g. ground-resource.png, ground-blocked.png) by extending TILE_TYPES. */

const TILE_TYPES = {
  ground: {
    insan:   'sleek brushed metal plating with subtle hex bolts and faint blue circuit traces, factory-clean surface',
    zerg:    'organic biomass membrane with magenta capillary veins and a wet glistening chitin sheen',
    otomat:  'polished chrome floor with embedded cyan logic gates and faint holographic circuit grid',
    canavar: 'volcanic basalt cobble with hairline orange ember cracks and a dusting of bone shards',
    seytan:  'obsidian floor tile with engraved deep-red sigil glyphs and faint smoke wisps clinging to the surface',
  },
  // Resource tiles — visually distinct from ground so the player can spot a
  // yield bonus at a glance. Adds a luminous deposit in the centre of each.
  resource: {
    insan:   'metal plating with a glowing blue crystalline mineral deposit erupting from the centre, sparks',
    zerg:    'pulsating biomass with bright magenta nutrient pool in the centre, organic spores rising',
    otomat:  'chrome floor with floating holographic cyan data-cube hovering over the centre',
    canavar: 'volcanic rock with a glowing orange lava vent in the centre spilling molten ore',
    seytan:  'obsidian with a swirling violet soul-fire flame burning at the centre, sigils glowing red',
  },
  // Blocked / impassable tiles — visually "rough" so the player skips them
  // when planning placements.
  blocked: {
    insan:   'damaged metal plating with twisted girders and warning hazard stripes, no surface to build on',
    zerg:    'dead chitinous scab with cracked bone protrusions blocking the centre, brown rot',
    otomat:  'fried circuit boards with broken cables and a dark glitched holographic error overlay',
    canavar: 'jagged spike of black volcanic rock erupting up from the tile, impassable',
    seytan:  'cracked obsidian shattered with red glow leaking from the cracks, cursed and unsafe',
  },
};

async function generateTile(race, type = 'ground') {
  const subject = TILE_TYPES[type]?.[race];
  if (!subject) throw new Error(`No tile prompt for ${race}/${type}`);

  // The model interprets "isometric diamond tile" as a flat top-down 30°
  // angle quad — we ask for transparent corners + perfect diamond shape so
  // the SVG renderer doesn't have to clip per-tile (every PNG IS already a
  // diamond on a transparent canvas).
  const positive = [
    'single isometric diamond floor tile, top-down 30 degree angle, 2:1 width-to-height ratio',
    `surface material: ${subject}`,
    'centered diamond shape, transparent background outside the diamond, edges crisp and aligned',
    'seamless texture in the centre so it could tile, no shadows cast outside the diamond',
    'game asset texture, no border lines, no overlay, no UI, no characters, no buildings',
    'nebula dominion: dark sci-fi manga aesthetic',
    'highly detailed, sharp focus, even lighting from above, neutral exposure',
  ].join(', ');

  const slug = type;
  return runAndSave(positive, TILES_OUTPUT_DIR, race, slug);
}

async function runAndSave(positive, baseDir, race, slug) {
  const workflow = buildWorkflow(positive, NEGATIVE_PROMPT, Math.floor(Math.random() * 1e9));
  console.log(`[${race}/${slug}] submitting…`);
  const queued = await postJSON('/prompt', { prompt: workflow, client_id: 'nebula-gen' });
  const promptId = queued.prompt_id;
  if (!promptId) throw new Error(`No prompt_id: ${JSON.stringify(queued)}`);

  for (let i = 0; i < 180; i++) {
    await sleep(2000);
    let hist;
    try {
      hist = await getJSON(`/history/${promptId}`);
    } catch {
      continue;
    }
    const entry = hist[promptId];
    if (!entry) continue;
    const outputs = entry.outputs || {};
    const imgs = outputs['9']?.images;
    if (imgs && imgs.length > 0) {
      const img = imgs[0];
      const data = await getFile(
        `/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder || '')}&type=${encodeURIComponent(img.type || 'output')}`,
      );
      const outDir = path.join(baseDir, race);
      fs.mkdirSync(outDir, { recursive: true });
      const outPath = path.join(outDir, `${slug}.png`);
      fs.writeFileSync(outPath, data);
      const kb = (data.length / 1024).toFixed(1);
      console.log(`[${race}/${slug}] ✓ ${outPath} (${kb} KB)`);
      return outPath;
    }
  }
  throw new Error(`[${race}/${slug}] timed out waiting for image`);
}

/* ── Entry ──────────────────────────────────────────────────────────────── */

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--all') {
    // Full sweep: every building, then every age backdrop, then every tile.
    for (const race of Object.keys(BUILDINGS)) {
      for (const b of BUILDINGS[race]) {
        try { await generateBuilding(race, b.slug, b.subject); }
        catch (e) { console.error(`[${race}/${b.slug}] FAILED: ${e.message}`); }
      }
    }
    for (const race of Object.keys(BUILDINGS)) {
      for (let age = 1; age <= 6; age++) {
        try { await generateBase(race, age); }
        catch (e) { console.error(`[${race}/age-${age}] FAILED: ${e.message}`); }
      }
    }
    for (const race of Object.keys(BUILDINGS)) {
      for (const type of Object.keys(TILE_TYPES)) {
        try { await generateTile(race, type); }
        catch (e) { console.error(`[${race}/tile-${type}] FAILED: ${e.message}`); }
      }
    }
  } else if (args[0] === '--all-buildings') {
    for (const race of Object.keys(BUILDINGS)) {
      for (const b of BUILDINGS[race]) {
        try { await generateBuilding(race, b.slug, b.subject); }
        catch (e) { console.error(`[${race}/${b.slug}] FAILED: ${e.message}`); }
      }
    }
  } else if (args[0] === '--all-bases') {
    for (const race of Object.keys(BUILDINGS)) {
      for (let age = 1; age <= 6; age++) {
        try { await generateBase(race, age); }
        catch (e) { console.error(`[${race}/age-${age}] FAILED: ${e.message}`); }
      }
    }
  } else if (args[0] === '--all-tiles') {
    for (const race of Object.keys(BUILDINGS)) {
      for (const type of Object.keys(TILE_TYPES)) {
        try { await generateTile(race, type); }
        catch (e) { console.error(`[${race}/tile-${type}] FAILED: ${e.message}`); }
      }
    }
  } else if (args[0] === '--tile' && args[1]) {
    // node scripts/comfy-gen.js --tile insan          → ground (default)
    // node scripts/comfy-gen.js --tile insan ground   → explicit type
    await generateTile(args[1], args[2] || 'ground');
  } else if (args[0] === '--commander' && args[1] && args[2]) {
    // node scripts/comfy-gen.js --commander zerg kthala "Brood-Anne hive matron"
    await generateCommander(args[1], args[2], args[3] || `${args[2]} commander portrait`);
  } else if (args[0] === '--base' && args[1] && args[2]) {
    await generateBase(args[1], Number(args[2]));
  } else if (args[0] && args[1]) {
    const [race, slug] = args;
    const def = BUILDINGS[race]?.find((b) => b.slug === slug);
    if (!def) {
      console.error(`Unknown ${race}/${slug}. Listing known:`);
      for (const r of Object.keys(BUILDINGS)) {
        console.error(`  ${r}: ${BUILDINGS[r].map((x) => x.slug).join(', ')}`);
      }
      process.exit(1);
    }
    await generateBuilding(race, slug, args[2] || def.subject);
  } else {
    console.error('Usage:');
    console.error('  node scripts/comfy-gen.js --all              # 30 buildings + 30 bases + 5 tiles');
    console.error('  node scripts/comfy-gen.js --all-buildings    # 30 buildings only');
    console.error('  node scripts/comfy-gen.js --all-bases        # 30 bases only');
    console.error('  node scripts/comfy-gen.js --all-tiles        # 5 ground tiles (one per race)');
    console.error('  node scripts/comfy-gen.js --tile insan       # one race ground tile');
    console.error('  node scripts/comfy-gen.js --base insan 3     # one race × age');
    console.error('  node scripts/comfy-gen.js insan komuta_ussu  # one building');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
