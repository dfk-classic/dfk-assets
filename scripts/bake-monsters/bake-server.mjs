// Local bake harness for monster art. Serves bake.html plus the mirrored Spine rigs, receives one rendered PNG per monster via POST /save, and writes public/monsters.csv on GET /done.
//
// Why bake at all: the monster rigs are Spine animations, and shipping a Spine runtime on the public site has licensing strings attached (Esoteric's runtime license expects a paid Spine editor seat behind production use). Rendering each rig's idle pose once, locally, and publishing plain PNGs sidesteps that entirely and keeps the site as simple as the equipment tab. Usage: node scripts/bake-monsters/bake-server.mjs, then open http://localhost:8123/ in a browser and wait for DONE in the console.

import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = join(here, "..", "..", "public");
const rigsDir = join(here, "rigs-cache");
const GAME_ORIGIN = "https://game.defikingdoms.com";

export const MONSTERS = [
	"baby-boar", "baby-boc", "big-boar", "blub-archer", "blub-knight", "blub-priest",
	"corrupted-citizen", "crusted-crab", "demon-boc", "drowned-hero", "drunkard", "egg-boc",
	"grifter", "harpy", "living-armor", "lost-soul", "nameless-apostle", "octopilot",
	"pickpocket", "rocboc", "sea-hag",
];

function titleCase(slug) {
	return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

// Mirror the rigs first if the cache is empty. game.defikingdoms.com sends no CORS headers, so the bake page must load rigs same-origin from this server; it cannot fetch them cross-origin itself.
for (const m of MONSTERS) {
	const dir = join(rigsDir, m);
	if (existsSync(join(dir, "skeleton.png"))) continue;
	mkdirSync(dir, { recursive: true });
	for (const f of ["skeleton.json", "skeleton.atlas", "skeleton.png"]) {
		const res = await fetch(`${GAME_ORIGIN}/assets/rigs/monsters/${m}/${f}`);
		if (!res.ok) throw new Error(`mirror failed: ${m}/${f} HTTP ${res.status}`);
		writeFileSync(join(dir, f), Buffer.from(await res.arrayBuffer()));
	}
	console.log(`mirrored rig: ${m}`);
}

mkdirSync(join(publicDir, "monsters"), { recursive: true });
const saved = new Map(); // name -> ext actually written, so monsters.csv points at what exists

const TYPES = { ".json": "application/json", ".atlas": "text/plain", ".png": "image/png", ".html": "text/html" };

createServer(async (req, res) => {
	const url = new URL(req.url, "http://localhost");
	if (req.method === "POST" && url.pathname === "/save") {
		const name = url.searchParams.get("name");
		// The bake page asks for gif (animated idle loop); png stays accepted so the old static bake still works if ever needed.
		const ext = url.searchParams.get("ext") === "png" ? "png" : "gif";
		if (!MONSTERS.includes(name)) { res.writeHead(400).end(); return; }
		const chunks = [];
		for await (const c of req) chunks.push(c);
		writeFileSync(join(publicDir, "monsters", `${name}.${ext}`), Buffer.concat(chunks));
		saved.set(name, ext);
		console.log(`baked ${name}.${ext} (${saved.size}/${MONSTERS.length})`);
		res.writeHead(200).end("ok");
		return;
	}
	if (url.pathname === "/done") {
		const rows = MONSTERS.filter((m) => saved.has(m)).map((m) => `${m},${titleCase(m)},monsters/${m}.${saved.get(m)}`);
		writeFileSync(join(publicDir, "monsters.csv"), "slug,name,file\n" + rows.join("\n") + "\n");
		console.log(`DONE: monsters.csv ${rows.length} rows${rows.length < MONSTERS.length ? " (INCOMPLETE)" : ""}`);
		res.writeHead(200).end("done");
		return;
	}
	const path = url.pathname === "/" ? "/bake.html" : url.pathname;
	const file = path.startsWith("/rigs/") ? join(rigsDir, path.slice(6)) : join(here, path.slice(1));
	// Read before writing the status line: a missing file (the browser always asks for /favicon.ico) must 404 cleanly, and headers cannot be unsent once writeHead has fired.
	try {
		const body = readFileSync(file);
		const ext = path.slice(path.lastIndexOf("."));
		res.writeHead(200, { "Content-Type": TYPES[ext] ?? "application/octet-stream" });
		res.end(body);
	} catch {
		res.writeHead(404).end();
	}
}).listen(8123, () => console.log("bake server on http://localhost:8123/"));
