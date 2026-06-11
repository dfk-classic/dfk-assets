import type { EquipmentCategory, EquipmentEntry } from "./types/equipment";

// Visage displayIds start here in the game client's data; everything below is regular gear. Shared with the refresh script, which uses the same boundary to split the two CSVs.
export const VISAGE_MIN_ID = 50000;

const CATEGORIES = new Set<EquipmentCategory>(["weapon", "armor", "accessory"]);

// Split one CSV line into fields, honoring double-quoted fields with "" escapes. Item names are currently comma-free, but the dataset emitter quotes any field that needs it, so a future name like "Sword, Broken" must not silently shear the row apart on its comma.
export function splitCsvLine(line: string): string[] {
	const fields: string[] = [];
	let field = "";
	let inQuotes = false;
	for (let i = 0; i < line.length; i++) {
		const c = line[i];
		if (inQuotes) {
			if (c === '"' && line[i + 1] === '"') {
				field += '"';
				i++;
			} else if (c === '"') {
				inQuotes = false;
			} else {
				field += c;
			}
		} else if (c === '"') {
			inQuotes = true;
		} else if (c === ",") {
			fields.push(field);
			field = "";
		} else {
			field += c;
		}
	}
	fields.push(field);
	return fields;
}

// Parse an equipment CSV: drop the header row, then map each line onto the typed entry. Splitting on /\r?\n/ tolerates CRLF files so the trailing hasArt column never carries a stray \r that would turn "true" into "true\r" and render every icon as missing. Rows with the wrong column count, an unknown category, or non-numeric type/id are dropped so a malformed CSV can never inflate the count or emit a tile that points at a junk URL. Kept pure and separate from the component so parsing and load-failure handling can be exercised without a DOM.
export function parseEquipment(csv: string): EquipmentEntry[] {
	return csv
		.trim()
		.split(/\r?\n/)
		.slice(1)
		.map((line) => splitCsvLine(line))
		.filter((f) => f.length === 8)
		.map((f) => {
			const [category, equipmentType, equipmentTypeName, displayId, enumName, name, imageUrl, hasArt] = f;
			return {
				category: category as EquipmentCategory,
				equipmentType: Number(equipmentType),
				equipmentTypeName,
				displayId: Number(displayId),
				enumName,
				name,
				imageUrl,
				hasArt: hasArt === "true",
				isVisage: Number(displayId) >= VISAGE_MIN_ID,
			};
		})
		.filter(
			(e) =>
				CATEGORIES.has(e.category) &&
				Number.isFinite(e.equipmentType) &&
				Number.isFinite(e.displayId) &&
				e.name !== "" &&
				e.imageUrl !== "",
		);
}

export type EquipmentLoadResult = { entries: EquipmentEntry[]; status: string };

// Load and parse both CSVs, turning any failure into a visible status instead of an unhandled rejection that would leave the UI stuck on "loading equipment...". The fetches are injected so the success and failure paths are both testable.
export async function loadEquipment(
	fetchCsvs: Array<() => Promise<string>>,
): Promise<EquipmentLoadResult> {
	try {
		const texts = await Promise.all(fetchCsvs.map((f) => f()));
		const entries = texts.flatMap(parseEquipment);
		const visages = entries.filter((e) => e.isVisage).length;
		return {
			entries,
			status: `equipment loaded: ${entries.length} items (${entries.length - visages} gear, ${visages} visages).`,
		};
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		return { entries: [], status: `equipment failed to load: ${message.slice(0, 90)}` };
	}
}
