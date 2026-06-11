# DFK Classic Assets

Browse DeFi Kingdoms game art in one place: equipment and visages, items, town
NPCs, and combat monsters, with a one-click download on every tile. Companion
app to [hero-viewer](https://github.com/dfk-classic/hero-viewer) and
[transcended-roster](https://github.com/dfk-classic/transcended-roster).

**Live: https://gen-a.dev/dfk-assets/**

## Sections

- **Equipment**: all 170 known weapons, armor, accessories, shields, and
  visages, with tabs and search. Icons hotlink the public game art CDN.
- **Items**: 157 item icons (potions, runes, crystals, fish, plants, eggs),
  indexed straight off the CDN.
- **NPCs**: 37 town characters (trader, vendor, jeweler, druid, portal keepers,
  and friends) as their animated idle GIFs, mirrored from the game client.
- **Monsters**: all 21 combat enemies (bocs, boars, blubs, harpy, sea hag,
  nameless apostle...) as baked idle poses on transparency.
- **Hero Viewer** links out to the existing
  [hero card viewer](https://gen-a.dev/dfk-hero-viewer/).

No API or backend anywhere: datasets ship as CSVs in `public/`, images either
hotlink the stable CDN or are mirrored in the repo.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5175/dfk-assets/. Requires Node 18+.

## The datasets and where the art lives

| Dataset | Source | Strategy |
|---|---|---|
| `gear.csv`, `visages.csv` | `defi-kingdoms.b-cdn.net/art-assets/equipment/{category}/{type}-{displayId}.png` | hotlink (stable URLs) |
| `items.csv` | `defi-kingdoms.b-cdn.net/art-assets/items/<slug>.png` | hotlink (stable URLs) |
| `npcs.csv` + `public/npcs/` | game client Vite assets (`game.defikingdoms.com/assets/<name>-<hash>.gif`) | mirrored, hashes rotate every game deploy |
| `monsters.csv` + `public/monsters/` | game client Spine rigs (`assets/rigs/monsters/<name>/`) | baked locally to static PNGs |

Equipment identity is the `(category, equipmentType, displayId)` triple, which
is exactly what the WeaponCore, ArmorCore, and AccessoryCore contracts store
per NFT; `displayId` alone is not unique and visage ids start at 50000. The
chain stores no art and `tokenURI()` returns an empty string, so everything
here is extracted from the public game client.

Refresh scripts, one per dataset:

```bash
npm run refresh-data    # equipment + visages: re-extract from the game bundle, verify every URL
node scripts/refresh-items.mjs   # items: re-index CDN slugs from the game bundle
node scripts/refresh-npcs.mjs    # NPCs: re-resolve hashed GIF names and re-mirror
node scripts/bake-monsters/bake-server.mjs   # monsters: serve the bake harness, then open it in a browser
```

Monster rigs are Spine animations. The public site deliberately ships baked
static poses instead of a live Spine runtime: Esoteric's runtime license
expects a paid Spine editor seat behind production use, and plain PNGs keep
the site dependency-free. The bake harness renders each rig's idle pose once,
locally, through the browser.

## Credits

- DeFi Kingdoms, its game assets, artwork, item, NPC, and monster designs are
  the property of Kingdom Studios. This project is community-made and not
  affiliated with Kingdom Studios.
- Art provenance: extracted from the publicly served DeFi Kingdoms game client
  and its public art CDN, 2026-06-11. Kingdom Studios logos are deliberately
  excluded from the mirrored assets.
