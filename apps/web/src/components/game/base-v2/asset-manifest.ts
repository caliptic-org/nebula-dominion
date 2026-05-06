/**
 * CAL-349 generated asset manifest.
 *
 * The Image Generator agent posted these images as inline markdown URLs
 * (not as proper Caliptic attachments), so they cannot currently be
 * downloaded into /public via `caliptic attachment download`. They are
 * referenced directly off the workspace upload CDN; `next.config.js`
 * whitelists `appi.caliptic.com/uploads/**` for `next/image`.
 *
 * Once an upstream pass moves these to proper attachments, swap each URL
 * for its repo-local `/assets/<bucket>/<race>/<name>.webp` path; consumers
 * already use only the keys defined in this file.
 *
 * Coverage notes (2026-05-06):
 *   ✔ all 5 ground textures (human falls back to battlefield variant)
 *   ✔ 9 ability icons (gas/energy/population + attack/defend/special/ultimate/rally/move)
 *   ✔ 9 building thumbnails (human/zerg/automat covered, beast/demon partial)
 *   ✔ 11 isometric building sprites (human full, zerg full, automat full, demon partial)
 *   ✘ unit portraits (humanoid bust 64×64) — 0 of 18 generated
 *   ✘ beast iso sprites — 0 of 3 generated
 *   ✘ demon iso/thumb partial — additional retries pending
 */

const W =
  'https://appi.caliptic.com/uploads/workspaces/2fc03873-7c40-4d9a-922d-d66f6e30f2aa';

export const GROUND_TEXTURES = {
  human:   `${W}/019dfd24-a228-7cd3-9313-318fcb7300e1.png`, // human-battlefield (no human-base in batch)
  zerg:    `${W}/019dfcac-11dc-769d-962e-96c701dbdef6.png`, // zerg-organic
  automat: `${W}/019dfcac-726c-7df5-b790-2597eb68bc2d.png`, // automat-crystal
  beast:   `${W}/019dfcbe-4a65-7bb6-a766-c9916ac7c87b.png`, // beast-volcanic
  demon:   `${W}/019dfccb-8488-7848-b188-2ccb129d68c2.png`, // demon-void
} as const;

export const BATTLEFIELD_TEXTURES = {
  human:   `${W}/019dfd24-a228-7cd3-9313-318fcb7300e1.png`,
  zerg:    `${W}/019dfd26-9123-7977-8193-9fb4de577c46.png`,
  automat: `${W}/019dfd2a-7da1-7d5a-9967-fdfad556e6fd.png`,
} as const;

export const ABILITY_ICONS = {
  gas:        `${W}/019dfcac-cfe3-72a1-924b-bbffa09346bd.png`,
  population: `${W}/019dfcad-37f2-7dab-bb8a-094b8a0a6560.png`,
  energy:     `${W}/019dfcbe-8c23-7e00-90fe-45f902968e26.png`,
  attack:     `${W}/019dfccb-9c36-7a60-a1a7-c54b782d2b88.png`,
  defend:     `${W}/019dfd24-b9f6-7a1d-bdcc-842cdbc90f89.png`,
  special:    `${W}/019dfd26-a8e8-7884-af71-66e8b136287a.png`,
  ultimate:   `${W}/019dfd2a-9d5e-7ee3-9de9-e68736f96bc4.png`,
  rally:      `${W}/019dfd71-065e-78df-8495-9529e3965f20.png`,
  move:       `${W}/019dfd74-d608-76e1-a3a3-97617b22cfa0.png`,
} as const;

/** Building thumbnails (64×64 portrait icons). Keys: `<race>/<type>`. */
export const BUILDING_THUMBS: Record<string, string | undefined> = {
  'human/factory':       `${W}/019dfcad-8121-75c3-a7fb-d65968c51efe.png`,
  'human/command':       `${W}/019dfcbe-d432-7b6a-9ddb-9bd2bf60ae56.png`,
  'zerg/spawning-pool':  `${W}/019dfcad-ddf7-7957-b55d-3d4faaa3c27a.png`,
  'zerg/hive':           `${W}/019dfccb-b42c-76b2-b8fb-68c815defc36.png`,
  'zerg/spire':          `${W}/019dfd24-d1c3-7527-accb-464d8a75570d.png`,
  'automat/nexus':       `${W}/019dfd26-c0f7-76d2-9d92-5b2c055bc43e.png`,
  'automat/forge':       `${W}/019dfd2a-ba4c-7b80-b3db-4cb008ef7001.png`,
  'automat/pylon':       `${W}/019dfd71-1e47-7059-ba90-fe321843f61f.png`,
  'beast/stronghold':    `${W}/019dfd74-f5b4-76e1-ad83-d161bc45d7f4.png`,
};

/** Building isometric sprites (256×256 transparent bg). Keys: `<race>/<type>`. */
export const BUILDING_ISOS: Record<string, string | undefined> = {
  'human/barracks':      `${W}/019dfcae-53d2-76b0-a630-ab9cb9ce88bb.png`,
  'human/factory':       `${W}/019dfcae-afa3-77ad-b5a6-7f5f682f486c.png`,
  'human/command':       `${W}/019dfcbf-146c-774d-9940-4e993a56a65c.png`,
  'zerg/hive':           `${W}/019dfccb-d3cf-7284-8575-fb1f19a2b696.png`,
  'zerg/spawning-pool':  `${W}/019dfd24-f13d-7aec-8d1e-ea86781bb0db.png`,
  'zerg/spire':          `${W}/019dfd26-e0a1-745f-a6ac-38a76731bca7.png`,
  'automat/nexus':       `${W}/019dfd2a-e165-7ab9-b6c5-60aa78cd8d29.png`,
  'automat/forge':       `${W}/019dfd71-3dd4-7bb1-983f-bbc3a32fc85a.png`,
  'automat/pylon':       `${W}/019dfd75-19e7-7f39-aaf9-5a114abf6c41.png`,
  'demon/portal':        `${W}/019dfcaf-3344-7382-bced-c94278e052b3.png`,
};

export type GroundRaceKey = keyof typeof GROUND_TEXTURES;
