// Imports retired NPC GIFs from renpen's DFK art archive into public/npcs/ and writes public/npcs-archive.csv.
//
// These characters (the Serendale tavern cast, docks workers, jeweler staff, and friends) shipped in older game client builds and are no longer referenced by the live client, so refresh-npcs.mjs cannot fetch them. The only known source is the community archive renpen scraped while the assets were still served (Google Drive folder "DFK Art Files"). This script copies a curated selection from a local download of that archive. Usage:
//   node scripts/import-archive-npcs.mjs [path-to-extracted-archive]   (default: C:/Users/Yin/dfk-classic/dfkartfiles)
//
// Filenames in the archive keep the game's original Vite hashed names, which is how each entry below is matched. Slugs are normalized (lowercase, hyphens) and suffixed with -serendale where a live Crystalvale character already owns the plain slug.

import { copyFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const archiveRoot = process.argv[2] ?? "C:/Users/Yin/dfk-classic/dfkartfiles";

// [archive file prefix (folder + base name without hash), slug, display name, location note]
const ARCHIVE_NPCS = [
	// Serendale
	["Serendale/Alchemist/alchemist", "alchemist-serendale", "Alchemist", "Alchemist, Serendale"],
	["Serendale/Castle/BunKing", "bun-king", "Bun King", "Castle, Serendale"],
	["Serendale/Castle/BunMonster", "bun-monster", "Bun Monster", "Castle, Serendale"],
	["Serendale/Castle/castle_artist", "castle-artist-serendale", "Castle Artist", "Castle, Serendale"],
	["Serendale/Castle/yara", "yara", "Yara", "Castle, Serendale"],
	["Serendale/Combat Training Grounds/stompymcgee", "stompymcgee", "Stompy McGee", "Combat Training, Serendale"],
	["Serendale/Docks/docks_clumsyworkers", "docks-clumsyworkers", "Clumsy Workers", "Docks, Serendale"],
	["Serendale/Docks/docks_dockmaster", "dockmaster-serendale", "Dockmaster", "Docks, Serendale"],
	["Serendale/Docks/docks_grampy", "grampy", "Grampy", "Docks, Serendale"],
	["Serendale/Docks/docks_togwa", "togwa-serendale", "Togwa", "Docks, Serendale"],
	["Serendale/Docks/docks_togwahat", "togwa-hat", "Togwa (Hat)", "Docks, Serendale"],
	["Serendale/Docks/docks_traveler", "traveler", "Traveler", "Docks, Serendale"],
	["Serendale/Docks/docks_worker1", "dock-worker-1", "Dock Worker", "Docks, Serendale"],
	["Serendale/Docks/docks_worker2", "dock-worker-2", "Dock Worker", "Docks, Serendale"],
	["Serendale/Gardens/garden-druid", "garden-druid", "Druid", "Gardens, Serendale"],
	["Serendale/Gardens/garden-henry", "henry", "Henry", "Gardens, Serendale"],
	["Serendale/Jeweler/jeweler_ian", "ian", "Ian", "Jeweler, Serendale"],
	["Serendale/Jeweler/jeweler_lila", "lila", "Lila", "Jeweler, Serendale"],
	["Serendale/Jeweler/jeweler_manager", "jeweler-manager", "Jeweler Manager", "Jeweler, Serendale"],
	["Serendale/Jeweler/jeweler_micah", "micah", "Micah", "Jeweler, Serendale"],
	["Serendale/Jeweler/jeweler_togwa", "togwa-jeweler", "Togwa (Jeweler)", "Jeweler, Serendale"],
	["Serendale/Marketplace/ned", "ned", "Ned", "Marketplace, Serendale"],
	["Serendale/Portal/archdruid", "archdruid", "Archdruid", "Portal, Serendale"],
	["Serendale/Portal/gareth", "gareth", "Gareth", "Portal, Serendale"],
	["Serendale/Portal/stonecarver", "stonecarver-serendale", "Stonecarver", "Portal, Serendale"],
	["Serendale/Portal/summoner", "summoner-serendale", "Summoner", "Portal, Serendale"],
	["Serendale/Professions/expeditions_caravan-leader_purple", "caravan-leader-purple", "Caravan Leader (Purple)", "Professions, Serendale"],
	["Serendale/Professions/expeditions_caravan-leader_yellow", "caravan-leader-yellow", "Caravan Leader (Yellow)", "Professions, Serendale"],
	["Serendale/Professions/professions_foraging", "foraging-trainer", "Foraging Trainer", "Professions, Serendale"],
	["Serendale/Professions/professions_garden", "gardening-trainer", "Gardening Trainer", "Professions, Serendale"],
	["Serendale/Professions/professions_mining", "mining-trainer", "Mining Trainer", "Professions, Serendale"],
	["Serendale/Professions/professions_tom", "tom", "Tom", "Professions, Serendale"],
	["Serendale/Tavern/huntmaster", "huntmaster", "Huntmaster", "Tavern, Serendale"],
	// Crystalvale characters that have since left the live client
	["Crystalvale/Alchemist/npc-assistant", "alchemist-assistant", "Alchemist Assistant", "Alchemist, Crystalvale"],
	["Crystalvale/Castle/cultists", "cultists", "Cultists", "Castle, Crystalvale"],
	["Crystalvale/Castle/dwarfking-entourage", "dwarfking-entourage", "Dwarf King's Entourage", "Castle, Crystalvale"],
	["Crystalvale/Castle/lazyboy", "lazyboy", "Lazy Boy", "Castle, Crystalvale"],
	["Crystalvale/Castle/suscultist", "suscultist", "Suspicious Cultist", "Castle, Crystalvale"],
	["Crystalvale/Dark Summoner/assistant1", "summoner-assistant-1", "Summoner Assistant", "Dark Summoner, Crystalvale"],
	["Crystalvale/Dark Summoner/assistant2", "summoner-assistant-2", "Summoner Assistant", "Dark Summoner, Crystalvale"],
	["Crystalvale/Dark Summoner/assistant3", "summoner-assistant-3", "Summoner Assistant", "Dark Summoner, Crystalvale"],
	["Crystalvale/Dark Summoner/paladin", "paladin", "Paladin", "Dark Summoner, Crystalvale"],
	["Crystalvale/Docks/cex-npc-cv", "cex-npc", "Exchange Clerk", "Docks, Crystalvale"],
	["Crystalvale/Jeweler/banker", "banker", "Banker", "Jeweler, Crystalvale"],
	["Crystalvale/Marketplace/Armorer", "armorer", "Armorer", "Marketplace, Crystalvale"],
	["Crystalvale/Marketplace/firedwarf", "firedwarf", "Fire Dwarf", "Marketplace, Crystalvale"],
	["Crystalvale/Marketplace/market_alchemist", "market-alchemist", "Market Alchemist", "Marketplace, Crystalvale"],
	["Crystalvale/Marketplace/market_dwarves", "market-dwarves", "Market Dwarves", "Marketplace, Crystalvale"],
	["Crystalvale/Marketplace/market_jeremy", "jeremy", "Jeremy", "Marketplace, Crystalvale"],
	["Crystalvale/Marketplace/market_patrons0", "market-patrons", "Market Patrons", "Marketplace, Crystalvale"],
	["Crystalvale/Marketplace/market_pirate", "market-pirate", "Market Pirate", "Marketplace, Crystalvale"],
	["Crystalvale/Marketplace/market_shaggy", "shaggy", "Shaggy", "Marketplace, Crystalvale"],
	["Crystalvale/Marketplace/packboc", "packboc", "Packboc", "Marketplace, Crystalvale"],
	["Crystalvale/Marketplace/Weaponsmith", "weaponsmith", "Weaponsmith", "Marketplace, Crystalvale"],
	["Crystalvale/Meditation Circle/stumpy", "stumpy", "Stumpy", "Meditation Circle, Crystalvale"],
	["Crystalvale/Tavern/huntsmaster", "huntsmaster", "Huntsmaster", "Tavern, Crystalvale"],
	["Crystalvale/Tavern/tavern_bar_lady", "tavern-bar-lady", "Bar Lady", "Tavern, Crystalvale"],
	["Crystalvale/Tavern/tavern_bar_patron", "tavern-bar-patron", "Bar Patron", "Tavern, Crystalvale"],
	["Crystalvale/Tavern/tavern_barley", "barley", "Barley", "Tavern, Crystalvale"],
	["Crystalvale/Tavern/tavern_duel", "tavern-duel", "Dueling Patrons", "Tavern, Crystalvale"],
	["Crystalvale/Tavern/tavern_dwarf", "tavern-dwarf", "Tavern Dwarf", "Tavern, Crystalvale"],
	["Crystalvale/Tavern/tavern_fan_dwarf", "tavern-fan-dwarf", "Fan (Dwarf)", "Tavern, Crystalvale"],
	["Crystalvale/Tavern/tavern_fan_mom", "tavern-fan-mom", "Fan (Mom)", "Tavern, Crystalvale"],
	["Crystalvale/Tavern/tavern_fan_noble", "tavern-fan-noble", "Fan (Noble)", "Tavern, Crystalvale"],
	["Crystalvale/Tavern/tavern_fan_old", "tavern-fan-elder", "Fan (Elder)", "Tavern, Crystalvale"],
	["Crystalvale/Tavern/tavern_fan_pirate_f", "tavern-fan-pirate-f", "Fan (Pirate)", "Tavern, Crystalvale"],
	["Crystalvale/Tavern/tavern_fan_pirate_m", "tavern-fan-pirate-m", "Fan (Pirate)", "Tavern, Crystalvale"],
	["Crystalvale/Tavern/tavern_hoppes", "hoppes", "Hoppes", "Tavern, Crystalvale"],
	["Crystalvale/Tavern/tavern_knight_squire", "knight-and-squire", "Knight & Squire", "Tavern, Crystalvale"],
	["Crystalvale/Tavern/tavern_mercenary_armor", "mercenary-armor", "Mercenary (Armor)", "Tavern, Crystalvale"],
	["Crystalvale/Tavern/tavern_mercenary_bandana", "mercenary-bandana", "Mercenary (Bandana)", "Tavern, Crystalvale"],
	["Crystalvale/Tavern/tavern_mercenary_captain", "mercenary-captain", "Mercenary Captain", "Tavern, Crystalvale"],
	["Crystalvale/Tavern/tavern_mercenary_coolhair", "mercenary-coolhair", "Mercenary (Cool Hair)", "Tavern, Crystalvale"],
	["Crystalvale/Tavern/tavern_mercenary_goatee", "mercenary-goatee", "Mercenary (Goatee)", "Tavern, Crystalvale"],
	["Crystalvale/Tavern/tavern_pirate_elf", "pirate-elf", "Pirate Elf", "Tavern, Crystalvale"],
	["Crystalvale/Tavern/tavern_pirate_scarred", "scarred-pirate", "Scarred Pirate", "Tavern, Crystalvale"],
	["Crystalvale/Tavern/tavern_vampire", "tavern-vampire", "Vampire", "Tavern, Crystalvale"],
	["Crystalvale/Tavern/tavern_visage", "visage-merchant", "Visage Merchant", "Tavern, Crystalvale"],
	["Crystalvale/Tavern/tavern_walrus", "walrus", "Walrus", "Tavern, Crystalvale"],
	["Crystalvale/Tavern/tavern_wiseman", "wiseman", "Wiseman", "Tavern, Crystalvale"],
	["Crystalvale/Tavern/tavern_wizard", "tavern-wizard", "Wizard", "Tavern, Crystalvale"],
];

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = join(here, "..", "public");
mkdirSync(join(publicDir, "npcs"), { recursive: true });

// Resolve "folder/base" to the actual hashed file in the archive (base-XXXXXXXX.gif), tolerating " (1)" duplicate-download suffixes.
function findArchiveFile(prefix) {
	const dir = join(archiveRoot, dirname(prefix));
	const base = prefix.slice(prefix.lastIndexOf("/") + 1);
	const candidates = readdirSync(dir).filter(
		(f) => f.toLowerCase().endsWith(".gif") && (f === `${base}.gif` || f.startsWith(`${base}-`)),
	);
	if (!candidates.length) return null;
	// Prefer the un-suffixed copy when Drive produced "name (1).gif" duplicates.
	candidates.sort((a, b) => a.length - b.length);
	return join(dir, candidates[0]);
}

const rows = [];
const missing = [];
const seen = new Set();
for (const [prefix, slug, name, note] of ARCHIVE_NPCS) {
	if (seen.has(slug)) throw new Error(`duplicate slug in curated list: ${slug}`);
	seen.add(slug);
	const src = findArchiveFile(prefix);
	if (!src || !statSync(src).size) {
		missing.push(prefix);
		continue;
	}
	const file = `npcs/${slug}.gif`;
	copyFileSync(src, join(publicDir, file));
	rows.push({ slug, name, file, note: `${note} (archive)` });
}

const esc = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
writeFileSync(
	join(publicDir, "npcs-archive.csv"),
	"slug,name,file,note\n" + rows.map((r) => [r.slug, r.name, r.file, r.note].map(esc).join(",")).join("\n") + "\n",
);
console.log(`npcs-archive.csv: ${rows.length} rows`);
if (missing.length) {
	console.error(`MISSING from archive (${missing.length}): ${missing.join(", ")}`);
	process.exitCode = 1;
}
