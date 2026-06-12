// Mirrors the town NPC idle GIFs out of the live game client into public/npcs/ and writes public/npcs.csv.
//
// The NPC art ships inside the client as Vite-bundled assets, served from game.defikingdoms.com/assets/<name>-<contentHash>.gif. Those hashes rotate on every game deploy, so hotlinking would rot; this script reads the current bundle, resolves each curated NPC name to its current hashed filename, downloads the GIF, and records it. Run it after a game deploy if an NPC looks missing: node scripts/refresh-npcs.mjs

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const GAME_ORIGIN = "https://game.defikingdoms.com";

// Curated character GIFs from the bundle's named assets. Deliberately excludes non-characters (banners, thumbs, scene art, quest icons, profession splashes) and all Kingdom Studios logos, which the KS usage policy excludes from public reuse.
const NPCS = [
	["agent-leafblade", "Agent Leafblade"],
	["angler", "Angler"],
	["aoisla", "Aoisla"],
	["bjorn", "Bjorn"],
	["caravan-leader", "Caravan Leader"],
	["castle_archivist_gribbitz", "Archivist Gribbitz"],
	["castle_artist", "Castle Artist"],
	["castle_envoy", "Castle Envoy"],
	["cliff", "Cliff"],
	["crier", "Town Crier"],
	["crystalmanager", "Crystal Manager"],
	["dockmaster", "Dockmaster"],
	["druid", "Druid"],
	["emberling-party", "Emberling Party"],
	["esoteric-wanderer", "Esoteric Wanderer"],
	["forester", "Forester"],
	["greenskeeper", "Greenskeeper"],
	["hatcher", "Hatcher"],
	["hunter", "Hunter"],
	["jester", "Jester"],
	["jeweler", "Jeweler"],
	["npc-alchemist-cropped", "Alchemist"],
	["nutritionist", "Nutritionist"],
	["olga", "Olga"],
	["pickman", "Pickman"],
	["portal-amba", "Portal Keeper Amba"],
	["portal-zagreb", "Portal Keeper Zagreb"],
	["rafflemaster", "Rafflemaster"],
	["sheldon", "Sheldon"],
	["smuggler", "Smuggler"],
	["stonecarver", "Stonecarver"],
	["stylist", "Stylist"],
	// The bundle's asset slug says summoner, but the character is the Dark Summoner (the regular Summoner NPC looks different); display names are hand-kept here exactly because slugs lie.
	["summoner", "Dark Summoner"],
	["tafl", "Tafl"],
	["trader", "Trader"],
	["valkyrie", "Valkyrie"],
	["vendor", "Vendor"],
];

async function fetchText(url) {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`GET ${url} returned ${res.status}`);
	return res.text();
}

const html = await fetchText(GAME_ORIGIN + "/");
const bundlePath = html.match(/\/assets\/index-[\w-]+\.js/)?.[0];
if (!bundlePath) throw new Error("no /assets/index-*.js in the game page");
const js = await fetchText(GAME_ORIGIN + bundlePath);
console.log(`bundle: ${bundlePath} (${(js.length / 1e6).toFixed(1)} MB)`);

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
mkdirSync(join(publicDir, "npcs"), { recursive: true });

const rows = [];
const missing = [];
for (const [slug, name] of NPCS) {
	// Hashes are content-derived and per-file, so resolve each slug against the current bundle rather than caching old URLs.
	const m = js.match(new RegExp(`assets/${slug}-[A-Za-z0-9_\\-]{8,12}\\.gif`));
	if (!m) {
		missing.push(slug);
		continue;
	}
	const res = await fetch(`${GAME_ORIGIN}/${m[0]}`);
	if (!res.ok) {
		missing.push(`${slug} (HTTP ${res.status})`);
		continue;
	}
	writeFileSync(join(publicDir, "npcs", `${slug}.gif`), Buffer.from(await res.arrayBuffer()));
	rows.push({ slug, name, file: `npcs/${slug}.gif` });
	console.log(`saved ${slug}.gif`);
}

const esc = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
writeFileSync(
	join(publicDir, "npcs.csv"),
	"slug,name,file\n" + rows.map((r) => [r.slug, r.name, r.file].map(esc).join(",")).join("\n") + "\n",
);
console.log(`npcs.csv: ${rows.length} rows`);
if (missing.length) {
	// A missing slug usually means the asset was renamed in a new client build; fail loudly so the list gets re-curated instead of silently shrinking.
	console.error(`MISSING (${missing.length}): ${missing.join(", ")}`);
	process.exitCode = 1;
}
