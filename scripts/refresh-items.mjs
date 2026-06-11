// Rebuilds public/items.csv: every item icon URL the live game client references on the public art CDN.
//
// Item icons live at https://defi-kingdoms.b-cdn.net/art-assets/items/<slug>.png|gif with stable, slug-named URLs (unlike the hashed NPC GIFs), so they are indexed and hotlinked rather than mirrored. The slugs are lifted as literal strings from the game bundle, HEAD-verified, and written with a Title-Cased display name derived from the slug. Run after new items ship: node scripts/refresh-items.mjs

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const GAME_ORIGIN = "https://game.defikingdoms.com";
const PROBE_CONCURRENCY = 8;

async function fetchText(url) {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`GET ${url} returned ${res.status}`);
	return res.text();
}

// "atonement-crystal-greater" reads fine as "Atonement Crystal Greater"; a hand-kept name map is not worth maintaining for an art browser.
function titleCase(slug) {
	return slug
		.split("-")
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(" ");
}

const html = await fetchText(GAME_ORIGIN + "/");
const bundlePath = html.match(/\/assets\/index-[\w-]+\.js/)?.[0];
if (!bundlePath) throw new Error("no /assets/index-*.js in the game page");
const js = await fetchText(GAME_ORIGIN + bundlePath);
console.log(`bundle: ${bundlePath} (${(js.length / 1e6).toFixed(1)} MB)`);

const seen = new Map();
for (const m of js.matchAll(/art-assets\/items\/([a-z0-9\-]+)\.(png|gif)/g)) {
	if (!seen.has(m[1])) seen.set(m[1], `https://defi-kingdoms.b-cdn.net/${m[0]}`);
}
const rows = [...seen.entries()].map(([slug, url]) => ({ slug, name: titleCase(slug), imageUrl: url }));
rows.sort((a, b) => a.slug.localeCompare(b.slug));
console.log(`found ${rows.length} item slugs, verifying...`);

const queue = [...rows];
await Promise.all(
	Array.from({ length: PROBE_CONCURRENCY }, async () => {
		for (let r = queue.shift(); r; r = queue.shift()) {
			r.ok = await fetch(r.imageUrl, { method: "HEAD" }).then((res) => res.ok, () => false);
		}
	}),
);

// Dead URLs are dropped, not flagged: a slug that 404s here was referenced by code but never shipped to the CDN, which is noise in an art browser (unlike equipment, where the Ancient relics are real items worth showing).
const live = rows.filter((r) => r.ok);
const esc = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
writeFileSync(
	join(publicDir, "items.csv"),
	"slug,name,imageUrl\n" + live.map((r) => [r.slug, r.name, r.imageUrl].map(esc).join(",")).join("\n") + "\n",
);
console.log(`items.csv: ${live.length} rows (${rows.length - live.length} dead slugs dropped)`);
