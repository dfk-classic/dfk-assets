// Rebuilds public/gear.csv and public/visages.csv from the live game client.
//
// The chain stores only (equipmentType, displayId, dyes) per equipment NFT; names and art live client-side. This script downloads the game's JS bundle, lifts the item enums and name tables out of it, derives each item's icon URL on the public art CDN, HEAD-verifies every URL, and writes the two CSVs. Run it when a new visage or item ships: node scripts/refresh-data.mjs
//
// The bundle is minified, so variable names like the type enums change between deploys. Nothing here depends on them: enums are matched by shape, name maps are located by anchoring on item names that exist in every build (Ancient Greataxe, Karate Gi, ...) and walking outward, and type ids are read from whichever enum holds the well-known member names. If DFK ships a build this cannot parse, the script exits non-zero with the failing anchor named instead of writing partial CSVs.

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const GAME_ORIGIN = "https://game.defikingdoms.com";
const CDN_BASE = "https://defi-kingdoms.b-cdn.net/art-assets/equipment/";
const VISAGE_MIN_ID = 50000;
const PROBE_CONCURRENCY = 8;

// Stable game vocabulary, keyed by the enum member names the bundle uses.
const TYPE_LABELS = {
	weapon: { ONE_H_AXE: "1H Axe", TWO_H_AXE: "2H Axe", BOW: "Bow", DAGGER: "Dagger", GLOVES: "Gloves", ONE_H_MACE: "1H Mace", TWO_H_MACE: "2H Mace", ONE_H_SPEAR: "1H Spear", TWO_H_SPEAR: "2H Spear", STAFF: "Staff", ONE_H_SWORD: "1H Sword", TWO_H_SWORD: "2H Sword", WAND: "Wand" },
	armor: { LIGHT: "Light", MEDIUM: "Medium", HEAVY: "Heavy" },
	accessory: { ACCESSORY: "Accessory", SHIELD: "Shield", FOCUS: "Focus" },
};

function fail(what) {
	console.error(`refresh-data: ${what}. The game bundle layout may have changed; the parser needs updating.`);
	process.exit(1);
}

async function fetchText(url) {
	const res = await fetch(url);
	if (!res.ok) fail(`GET ${url} returned ${res.status}`);
	return res.text();
}

// ----- bundle parsing -----

// Every minified TS enum compiles to (t=>(t[t.NAME=0]="NAME",...))(VAR||{}); collect them all as { VAR: { NAME: id } }.
function collectEnums(js) {
	const enums = {};
	for (const m of js.matchAll(/\(t=>\(((?:t\[t\.[A-Z0-9_]+=\d+(?:e\d+)?\]="[A-Z0-9_]+",?)+)t\)\)\(([A-Za-z0-9_$]+)\|\|\{\}\)/g)) {
		const entries = {};
		for (const e of m[1].matchAll(/t\[t\.([A-Z0-9_]+)=(\d+(?:e\d+)?)\]/g)) entries[e[1]] = Number(e[2]);
		enums[m[2]] = entries;
	}
	return enums;
}

// Find the one enum that contains all the given member names; member identity survives minification even though the variable name does not.
function enumWithMembers(enums, members) {
	const hits = Object.entries(enums).filter(([, e]) => members.every((k) => k in e));
	if (hits.length !== 1) fail(`expected exactly one enum with members ${members.join(",")}, found ${hits.length}`);
	return hits[0][1];
}

// Return the object literal starting at the given "{".
function braceWalk(js, openIdx) {
	let depth = 0;
	for (let j = openIdx; j < js.length; j++) {
		const c = js[j];
		if (c === '"') {
			j++;
			while (js[j] !== '"') {
				if (js[j] === "\\") j++;
				j++;
			}
			continue;
		}
		if (c === "{") depth++;
		else if (c === "}" && --depth === 0) return js.slice(openIdx, j + 1);
	}
	fail(`unbalanced braces from index ${openIdx}`);
}

// All [VAR.NAME]:"Display Name" pairs in an object literal.
function parsePairs(obj) {
	return [...obj.matchAll(/\[([A-Za-z0-9_$]+)\.([A-Z0-9_]+)\]:"((?:[^"\\]|\\.)*)"/g)].map((e) => ({ enumVar: e[1], enumName: e[2], name: e[3] }));
}

// Locate a nested name map like {[at.UNCATEGORIZED]:{},[at.TWO_H_AXE]:{[i0.ANCIENT_GREATAXE]:"Ancient Greataxe",...},...}. anchorName is an item display name that sits inside the map; typeMember is the group key it sits under. From the anchor, the nearest preceding [VAR.typeMember]:{ names the key variable, and the map's outermost "{" is the last "{[VAR." before the anchor (inner group openings are comma-prefixed, so the pattern is unique to the map start).
function nestedNameMap(js, anchorName, typeMember) {
	const anchorIdx = js.indexOf(`:"${anchorName}"`);
	if (anchorIdx < 0) fail(`anchor item "${anchorName}" not found`);
	const back = js.slice(Math.max(0, anchorIdx - 300), anchorIdx);
	const keyVarMatch = [...back.matchAll(new RegExp(`\\[([A-Za-z0-9_$]+)\\.${typeMember}\\]:\\{`, "g"))].pop();
	if (!keyVarMatch) fail(`no [VAR.${typeMember}]:{ group near "${anchorName}"`);
	const keyVar = keyVarMatch[1];
	const mapStart = js.lastIndexOf(`{[${keyVar}.`, anchorIdx);
	if (mapStart < 0) fail(`no map start for key variable ${keyVar}`);
	const obj = braceWalk(js, mapStart);
	const groups = {};
	for (const g of obj.matchAll(new RegExp(`\\[${keyVar.replace(/\$/g, "\\$")}\\.([A-Z0-9_]+)\\]:\\{`, "g"))) {
		const end = obj.indexOf("}", g.index + g[0].length);
		groups[g[1]] = parsePairs(obj.slice(g.index + g[0].length, end));
	}
	return groups;
}

// Locate a flat name map like {[cr.SKALIS_EYE]:"Skali's Eye",...} from one item name inside it. Flat maps have no nested braces, so the map start is simply the last "{" before the anchor. The first occurrence of :"anchorName" in the bundle is the name map; lore maps repeat the enum keys but hold sentence-long values, so the anchor cannot land in one.
function flatNameMap(js, anchorName) {
	const anchorIdx = js.indexOf(`:"${anchorName}"`);
	if (anchorIdx < 0) fail(`anchor item "${anchorName}" not found`);
	return parsePairs(braceWalk(js, js.lastIndexOf("{", anchorIdx)));
}

// ----- assembly -----

const html = await fetchText(GAME_ORIGIN + "/");
const bundlePath = html.match(/\/assets\/index-[\w-]+\.js/)?.[0] ?? fail("no /assets/index-*.js in the game page");
const js = await fetchText(GAME_ORIGIN + bundlePath);
console.log(`bundle: ${bundlePath} (${(js.length / 1e6).toFixed(1)} MB)`);

const enums = collectEnums(js);
const weaponTypes = enumWithMembers(enums, ["TWO_H_SWORD", "WAND", "DAGGER"]);
const armorTypes = enumWithMembers(enums, ["LIGHT", "MEDIUM", "HEAVY"]);
const offhandTypes = enumWithMembers(enums, ["ACCESSORY", "SHIELD", "FOCUS"]);

const idOf = (pair) => {
	const en = enums[pair.enumVar];
	if (!en || !(pair.enumName in en)) fail(`no enum id for ${pair.enumVar}.${pair.enumName}`);
	return en[pair.enumName];
};

const rows = [];
function pushGroup(category, typeId, typeMember, pairs) {
	for (const pair of pairs) {
		rows.push({
			category,
			equipmentType: typeId,
			equipmentTypeName: TYPE_LABELS[category][typeMember] ?? typeMember,
			displayId: idOf(pair),
			enumName: pair.enumName,
			name: pair.name,
		});
	}
}

const weaponMap = nestedNameMap(js, "Ancient Greataxe", "TWO_H_AXE");
for (const [member, pairs] of Object.entries(weaponMap)) {
	if (member in TYPE_LABELS.weapon) pushGroup("weapon", weaponTypes[member], member, pairs);
}
const armorMap = nestedNameMap(js, "Karate Gi", "LIGHT");
for (const [member, pairs] of Object.entries(armorMap)) {
	if (member in TYPE_LABELS.armor) pushGroup("armor", armorTypes[member], member, pairs);
}
// Accessories and shields ship as flat maps (no per-type nesting): accessories under equipmentType 1, shields under 2. There is no focus name map yet; when focus items ship, this needs a third anchor.
pushGroup("accessory", offhandTypes.ACCESSORY, "ACCESSORY", flatNameMap(js, "Skali's Eye"));
pushGroup("accessory", offhandTypes.SHIELD, "SHIELD", flatNameMap(js, "Yolked Bockler"));

// ----- verify and write -----

const queue = [...rows];
await Promise.all(
	Array.from({ length: PROBE_CONCURRENCY }, async () => {
		for (let r = queue.shift(); r; r = queue.shift()) {
			const url = `${CDN_BASE}${r.category}/${r.equipmentType}-${r.displayId}.png`;
			r.imageUrl = url;
			r.hasArt = await fetch(url, { method: "HEAD" }).then((res) => res.ok, () => false);
		}
	}),
);

const CAT_ORDER = { weapon: 0, armor: 1, accessory: 2 };
rows.sort((a, b) => CAT_ORDER[a.category] - CAT_ORDER[b.category] || a.equipmentType - b.equipmentType || a.displayId - b.displayId);

const esc = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
const csv = (rs) =>
	"category,equipmentType,equipmentTypeName,displayId,enumName,name,imageUrl,hasArt\n" +
	rs.map((r) => [r.category, r.equipmentType, r.equipmentTypeName, r.displayId, r.enumName, r.name, r.imageUrl, r.hasArt].map(esc).join(",")).join("\n") +
	"\n";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const visages = rows.filter((r) => r.displayId >= VISAGE_MIN_ID);
const gear = rows.filter((r) => r.displayId < VISAGE_MIN_ID);
writeFileSync(join(publicDir, "visages.csv"), csv(visages));
writeFileSync(join(publicDir, "gear.csv"), csv(gear));

const dead = rows.filter((r) => !r.hasArt);
console.log(`gear.csv: ${gear.length} rows, visages.csv: ${visages.length} rows, ${dead.length} without art:`);
for (const r of dead) console.log(`  ${r.category}/${r.equipmentType}-${r.displayId} ${r.name}`);
