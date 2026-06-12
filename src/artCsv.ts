import { splitCsvLine } from "./equipment";

// One row of the simple art datasets (items.csv, npcs.csv, monsters.csv): a slug, a display name, where the image lives, and an optional note (the NPC sets use it for "location, zone" context). Items carry absolute CDN URLs (stable, hotlinkable); NPCs and monsters carry paths relative to the site root because their source URLs rot (NPC GIF hashes rotate every game deploy, monster loops are baked locally), so those files are mirrored under public/ and resolved against BASE_URL at load time.
export interface ArtEntry {
	slug: string;
	name: string;
	imageUrl: string;
	note?: string;
}

// Parse an art CSV: drop the header, split each line (quote-aware via splitCsvLine), resolve relative paths through the injected resolver, and drop malformed rows so a bad line never renders a broken tile. The fourth column is optional per-row, so three-column datasets (items, monsters) and noted datasets (NPCs) share one parser. Kept pure with the resolver injected so tests cover both absolute and relative datasets without a DOM.
export function parseArtCsv(csv: string, resolveUrl: (path: string) => string = (p) => p): ArtEntry[] {
	return csv
		.trim()
		.split(/\r?\n/)
		.slice(1)
		.map((line) => splitCsvLine(line))
		.filter((f) => (f.length === 3 || f.length === 4) && f[0] !== "" && f[1] !== "" && f[2] !== "")
		.map(([slug, name, url, note]) => ({
			slug,
			name,
			imageUrl: /^https?:\/\//.test(url) ? url : resolveUrl(url),
			...(note ? { note } : {}),
		}));
}

export type ArtLoadResult = { entries: ArtEntry[]; status: string };

// Same shape as loadEquipment: failures become a visible status string instead of an unhandled rejection that leaves a gallery stuck on its loading message. Takes a list of fetchers because some galleries span two datasets (NPCs = live-client mirror + renpen's archive of retired assets).
export async function loadArt(
	label: string,
	fetchCsvs: Array<() => Promise<string>>,
	resolveUrl?: (path: string) => string,
): Promise<ArtLoadResult> {
	try {
		const texts = await Promise.all(fetchCsvs.map((f) => f()));
		const entries = texts.flatMap((t) => parseArtCsv(t, resolveUrl));
		return { entries, status: `${label} loaded: ${entries.length}.` };
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		return { entries: [], status: `${label} failed to load: ${message.slice(0, 90)}` };
	}
}
