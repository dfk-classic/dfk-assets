// Mirrors the town NPC idle GIFs out of the live game client into public/npcs/ and writes public/npcs.csv.
//
// The NPC art ships inside the client as Vite-bundled assets, served from game.defikingdoms.com/assets/<name>-<contentHash>.gif. Two things make this script shaped the way it is: the hashes rotate on every game deploy (so hotlinking would rot), and most NPCs live in per-route lazy chunks, not the main index bundle (the Sundered Isles cast only exists in the docks/registry chunks). So it reads the index bundle, follows its __vite__mapDeps chunk list, greps every chunk for the curated slugs, downloads each GIF, and records it. Run after a game deploy: node scripts/refresh-npcs.mjs
//
// Display names and locations are hand-kept: slugs lie (the asset called summoner is the Dark Summoner) and only the game says where a character stands. Names still pending an in-game eyeball pass are best-effort Title Case.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const GAME_ORIGIN = "https://game.defikingdoms.com";

// [slug, display name, location note]. Curated character GIFs only: scene props, effects, backgrounds, splashes, quest icons, and all Kingdom Studios logos (excluded from public reuse by the KS usage policy) stay out.
const NPCS = [
	["agent-leafblade", "Agent Leafblade", "Crystalvale"],
	["angler", "Angler", "Professions"],
	["aoisla", "Aoisla", "Marketplace, Crystalvale"],
	["balconyman", "Balcony Man", "Registry, Sundered Isles"],
	["bjorn", "Bjorn", "Crystalvale"],
	["blondeknight", "Blonde Knight", "Docks, Sundered Isles"],
	["blub", "Blub", "Crystalvale"],
	["Brock-ODile", "Brock O'Dile", "Registry, Sundered Isles"],
	["caravan-leader", "Caravan Leader", "Professions, Crystalvale"],
	["castle_archivist_gribbitz", "Archivist Gribbitz", "Castle, Crystalvale"],
	["castle_artist", "Castle Artist", "Castle, Crystalvale"],
	["castle_envoy", "Castle Envoy", "Castle, Crystalvale"],
	["cat", "Cat", "Registry, Sundered Isles"],
	["catfishguard", "Catfish Guard", "Registry, Sundered Isles"],
	["cliff", "Cliff", "Combat Testing Grounds, Crystalvale"],
	["crabbins", "Crabbins", "Docks, Sundered Isles"],
	["crier", "Town Crier", "Marketplace, Crystalvale"],
	["crystalmanager", "Crystal Manager", "Jeweler, Crystalvale"],
	["dockmaster", "Dockmaster", "Docks, Crystalvale"],
	["dress_lady", "Lady in a Dress", "Docks, Sundered Isles"],
	["druid", "Druid", "Gardens, Crystalvale"],
	["dwarves", "Dwarves", "Registry, Sundered Isles"],
	["emberling-party", "Emberling Party", "Crystalvale"],
	["esoteric-wanderer", "Esoteric Wanderer", "Meditation Circle"],
	["fishguards", "Fish Guards", "Docks, Sundered Isles"],
	["forester", "Forester", "Professions"],
	["frog", "Frog", "Registry, Sundered Isles"],
	["frogchanter", "Frog Chanter", "Docks, Sundered Isles"],
	["frogtender", "Frog Tender", "Docks, Sundered Isles"],
	["goblinwarrior", "Goblin Warrior", "Registry, Sundered Isles"],
	["goldfishguard", "Goldfish Guard", "Registry, Sundered Isles"],
	["greenskeeper", "Greenskeeper", "Gardens"],
	["Green_beer", "Green Beer Patron", "Docks, Sundered Isles"],
	["hatcher", "Hatcher", "Marketplace, Crystalvale"],
	["hunter", "Hunter", "Marketplace, Crystalvale"],
	["ironbrother", "Iron Brother", "Docks, Sundered Isles"],
	["jester", "Jester", "Castle, Crystalvale"],
	["jeweler", "Jeweler", "Jeweler, Crystalvale"],
	["masterErik", "Master Erik", "Sundered Isles"],
	["npc-alchemist-cropped", "Alchemist", "Alchemist, Crystalvale"],
	["nutritionist", "Nutritionist", "Marketplace, Crystalvale"],
	["olga", "Olga", "Marketplace, Crystalvale"],
	["Orange_frog", "Orange Frog", "Docks, Sundered Isles"],
	["pickman", "Pickman", "Professions"],
	["portal-amba", "Portal Keeper Amba", "Portal, Crystalvale"],
	["portal-zagreb", "Portal Keeper Zagreb", "Portal, Crystalvale"],
	["rafflemaster", "Rafflemaster", "Castle, Crystalvale"],
	["redgreenman", "Red-Green Man", "Docks, Sundered Isles"],
	["Registrar", "Registrar", "Registry, Sundered Isles"],
	["SBDs", "Super Blub Defenders", "Registry, Sundered Isles"],
	["SD-Packboc", "Packboc", "Docks, Sundered Isles"],
	["sharkules", "Sharkules", "Docks, Sundered Isles"],
	["sheldon", "Sheldon", "Combat Testing Grounds, Crystalvale"],
	["sheldon-reroll", "Sheldon (Reroll)", "Docks, Sundered Isles"],
	["smuggler", "Smuggler", "Docks, Crystalvale"],
	["snakecultist", "Snake Cultist", "Registry, Sundered Isles"],
	["stonecarver", "Stonecarver", "Portal, Crystalvale"],
	["stylist", "Stylist", "Marketplace, Crystalvale"],
	// The asset slug says summoner, but the character is the Dark Summoner (the Serendale Summoner is a different sprite, preserved in the archive set).
	["summoner", "Dark Summoner", "Crystalvale"],
	["tafl", "Tafl", "Jeweler, Crystalvale"],
	["togwa", "Togwa", "Docks, Sundered Isles"],
	["trader", "Trader", "Marketplace, Crystalvale"],
	["valkyrie", "Valkyrie", "Divine Altar"],
	["vendor", "Vendor", "Marketplace, Crystalvale"],
	["witch", "Witch", "Docks, Sundered Isles"],
	["wizoholic", "Wizoholic", "Registry, Sundered Isles"],
];

async function fetchText(url) {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`GET ${url} returned ${res.status}`);
	return res.text();
}

const html = await fetchText(GAME_ORIGIN + "/");
const bundlePath = html.match(/\/assets\/index-[\w-]+\.js/)?.[0];
if (!bundlePath) throw new Error("no /assets/index-*.js in the game page");
const index = await fetchText(GAME_ORIGIN + bundlePath);
console.log(`bundle: ${bundlePath} (${(index.length / 1e6).toFixed(1)} MB)`);

// Collect gif references from the index plus every lazy chunk in the Vite preload map.
const found = new Map(); // base name -> hashed path
const collect = (js) => {
	for (const m of js.matchAll(/assets\/([A-Za-z0-9_\-]+)-[A-Za-z0-9_\-]{8,12}\.gif/gi)) {
		if (!found.has(m[1])) found.set(m[1], m[0]);
	}
};
collect(index);
const deps = index.match(/__vite__mapDeps[\s\S]{0,200}?\[([^\]]+)\]/);
const chunkNames = deps ? [...deps[1].matchAll(/"(assets\/[^"]+\.js)"/g)].map((m) => m[1]) : [];
console.log(`scanning ${chunkNames.length} chunks...`);
const queue = [...chunkNames];
await Promise.all(
	Array.from({ length: 8 }, async () => {
		for (let c = queue.shift(); c; c = queue.shift()) {
			try {
				collect(await fetchText(`${GAME_ORIGIN}/${c}`));
			} catch {
				console.error(`chunk failed: ${c}`);
			}
		}
	}),
);
console.log(`gif assets referenced by the client: ${found.size}`);

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
mkdirSync(join(publicDir, "npcs"), { recursive: true });

const rows = [];
const missing = [];
for (const [slug, name, note] of NPCS) {
	const path = found.get(slug);
	if (!path) {
		missing.push(slug);
		continue;
	}
	const res = await fetch(`${GAME_ORIGIN}/${path}`);
	if (!res.ok) {
		missing.push(`${slug} (HTTP ${res.status})`);
		continue;
	}
	const file = `npcs/${slug.toLowerCase()}.gif`;
	writeFileSync(join(publicDir, file), Buffer.from(await res.arrayBuffer()));
	rows.push({ slug: slug.toLowerCase(), name, file, note });
}

const esc = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
writeFileSync(
	join(publicDir, "npcs.csv"),
	"slug,name,file,note\n" + rows.map((r) => [r.slug, r.name, r.file, r.note].map(esc).join(",")).join("\n") + "\n",
);
console.log(`npcs.csv: ${rows.length} rows`);
if (missing.length) {
	// A missing slug usually means the asset was renamed or retired in a new client build; fail loudly so the list gets re-curated (or the entry moved to the archive set) instead of silently shrinking.
	console.error(`MISSING (${missing.length}): ${missing.join(", ")}`);
	process.exitCode = 1;
}
