# DFK Classic Equipment Viewer

Browse every DeFi Kingdoms equipment item and visage as icon tiles, served
straight from the public game art CDN. Companion app to
[hero-viewer](https://github.com/dfk-classic/hero-viewer) and
[transcended-roster](https://github.com/dfk-classic/transcended-roster).

## What it does

- Shows all 170 known items as tiles: pixel-art icon, name, type, and display id
- Tabs split the collection the way the game does: Weapons, Armor, Accessories,
  Shields, and Visages (visages get a badge and their own tab)
- Search matches display names and internal names, so "karate gi" also finds
  the Champion Gi (internally CHAMPIONSHIP_KARATE_GI)
- Items that exist in the game data but have no art yet (the id-0 Ancient
  relics) render a labeled placeholder instead of a broken image

No API or backend is needed: the dataset ships as two CSVs in `public/` and the
icons load directly from the game's CDN.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5175/dfk-equipment-viewer/. Requires Node 18+.

## The dataset

`public/gear.csv` (120 items) and `public/visages.csv` (50 visages) carry one
row per item: `category, equipmentType, equipmentTypeName, displayId, enumName,
name, imageUrl, hasArt`. Icons follow one URL pattern:

```
https://defi-kingdoms.b-cdn.net/art-assets/equipment/{category}/{equipmentType}-{displayId}.png
```

An item's identity is the `(category, equipmentType, displayId)` triple, which
is exactly what the WeaponCore, ArmorCore, and AccessoryCore contracts store
per NFT; `displayId` alone is not unique (all four weapon visages share 50000).
Visage displayIds start at 50000. Shields live in the accessory category
(equipmentType 2) because they share AccessoryCore on chain.

The chain stores no art and `tokenURI()` returns an empty string, so the CSVs
are extracted from the game client itself. When a new visage or item ships:

```bash
npm run refresh-data
```

downloads the current game bundle, re-extracts the item tables, HEAD-verifies
every icon URL, and rewrites both CSVs.

## Credits

- DeFi Kingdoms, its game assets, artwork, and item designs are the property of
  Kingdom Studios. This project is community-made and not affiliated with
  Kingdom Studios.
- Dataset extracted from the public DeFi Kingdoms game client; icons are served
  from the game's own public CDN and are not redistributed here.
