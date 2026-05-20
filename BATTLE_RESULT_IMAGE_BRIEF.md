# Battle Result Hero Images — Creative Director Brief

**Status**: Pending Image Generator task creation
**Priority**: High (visible on every battle completion)
**Screen**: `/battle-result` — BattleResultScreen component

## Context

`BattleResultScreen.tsx` uses the pattern `{race}-{outcome}.png` for hero images.
Currently only `otomat-victory.png` exists (generated via CAL-488).

## Images Required

Each image: 1024×1024px, dark sci-fi manga style, anime illustration, dramatic lighting

| Filename | Status | Race Color |
|---|---|---|
| `otomat-victory.png` | ✅ Done (CAL-488) | #00cfff |
| `zerg-victory.png` | ❌ Needed | #44ff44 |
| `zerg-defeat.png` | ❌ Needed | #44ff44 |
| `otomat-defeat.png` | ❌ Needed | #00cfff |
| `canavar-victory.png` | ❌ Needed | #ff6600 |
| `canavar-defeat.png` | ❌ Needed | #ff6600 |
| `insan-victory.png` | ❌ Needed | #4a9eff |
| `insan-defeat.png` | ❌ Needed | #4a9eff |
| `seytan-victory.png` | ❌ Needed | #cc00ff |
| `seytan-defeat.png` | ❌ Needed | #cc00ff |

## Image Generator Prompts

### Base Style
```
Dark sci-fi manga style, anime illustration, dramatic lighting, high detail, 1024x1024
Background: dark space (#080a10) with nebula clouds and distant star clusters
Lighting: neon glow from primary race color, cinematic rim lighting
Style refs: Guilty Gear, BlazBlue, Honkai Star Rail cutscenes
```

### Race Character Profiles

**ZERG** (color: #44ff44 — toxic green bioluminescence)
- Biomechanical insectoid warriors, organic-tech hybrid armor
- Chitinous carapace with green glowing veins, mandible jaw guards
- Victory: warrior standing triumphant over ruins, fist raised, green energy aurora
- Defeat: warrior kneeling amid debris, head bowed, armor cracked and smoking

**OTOMAT** (color: #00cfff — electric cyan)  
- Cyberpunk machine-race, chrome exoskeleton with holographic panels
- Geometric angular armor, glowing circuit patterns, visor eye-band
- Victory: mech stands tall, weapons deployed, cyan plasma energy surging
- Defeat: mech damaged, parts sparking, kneeling with one arm on ground

**CANAVAR** (color: #ff6600 — volcanic orange)
- Brutal berserker mutants, grotesque muscle-mass, jagged bone protrusions
- War paint and crude metal scrap armor, glowing orange lava-cracks in skin
- Victory: beast roaring with arms wide, orange flame explosion behind
- Defeat: slumped giant with wounds glowing, snarling defiantly

**İNSAN** (color: #4a9eff — royal blue)
- Elite human soldiers, clean tactical military armor, advanced but practical
- Blue energy shields and plasma rifles, helmet with HUD visor
- Victory: soldier saluting with squad behind, blue energy banner
- Defeat: soldier on one knee, head lowered, gripping rifle, dignified

**ŞEYTAN** (color: #cc00ff — hellish purple)
- Demonic entities in arcane armor, shadow and corruption aesthetic
- Gothic dark-tech fusion, purple energy tendrils, void-touched weapons
- Victory: figure rises with wings spread, purple void energy consuming frame
- Defeat: fallen on ground, purple energy dissipating, ominous stillness

## File Placement

All images go to: `apps/web/public/assets/battle-result/`

## Image Generator Issue Template

For each image, create a separate Caliptic issue:
- **Title**: `[Image Generator] Battle Result: {race-name} {outcome} hero image`
- **Assign to**: Image Generator agent
- **Description**: Include relevant prompt from above + base style

## Notes

- Images should be full bleed, suitable for cropping to different aspect ratios
- Important: race color must be the dominant glow/light source in the image
- Victory images should feel epic and triumphant (warm energy, expansion)
- Defeat images should feel melancholic but not pathetic (dignity in defeat)
