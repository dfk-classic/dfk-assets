import { describe, it, expect } from "vitest";
import { parseEquipment, loadEquipment, splitCsvLine, VISAGE_MIN_ID } from "../../src/equipment";

const HEADER = "category,equipmentType,equipmentTypeName,displayId,enumName,name,imageUrl,hasArt";
const ROW_GEAR = "weapon,2,2H Axe,1,GORE_AXE,Gore Axe,https://defi-kingdoms.b-cdn.net/art-assets/equipment/weapon/2-1.png,true";
const ROW_VISAGE = "armor,1,Light,50001,KARATE_GI,Karate Gi,https://defi-kingdoms.b-cdn.net/art-assets/equipment/armor/1-50001.png,true";
const ROW_NO_ART = "armor,1,Light,0,ANCIENT_LIGHT_ARMOR,Ancient Light Armor,https://defi-kingdoms.b-cdn.net/art-assets/equipment/armor/1-0.png,false";

describe("splitCsvLine", () => {
	it("splits plain comma-separated fields", () => {
		expect(splitCsvLine("a,b,c")).toEqual(["a", "b", "c"]);
	});

	it("keeps commas inside double-quoted fields and unescapes doubled quotes", () => {
		// Item names are comma-free today, but the dataset emitter quotes any field that needs it; a future "Sword, Broken" must stay one field, not shear the row apart.
		expect(splitCsvLine('weapon,"Sword, Broken","He said ""hi"""')).toEqual([
			"weapon",
			"Sword, Broken",
			'He said "hi"',
		]);
	});
});

describe("parseEquipment", () => {
	it("skips the header row and maps each line onto a typed entry", () => {
		const entries = parseEquipment([HEADER, ROW_GEAR].join("\n"));
		expect(entries).toEqual([
			{
				category: "weapon",
				equipmentType: 2,
				equipmentTypeName: "2H Axe",
				displayId: 1,
				enumName: "GORE_AXE",
				name: "Gore Axe",
				imageUrl: "https://defi-kingdoms.b-cdn.net/art-assets/equipment/weapon/2-1.png",
				hasArt: true,
				isVisage: false,
			},
		]);
	});

	it("derives isVisage from the displayId boundary", () => {
		const entries = parseEquipment([HEADER, ROW_GEAR, ROW_VISAGE].join("\n"));
		expect(entries.map((e) => e.isVisage)).toEqual([false, true]);
		expect(entries[1].displayId).toBeGreaterThanOrEqual(VISAGE_MIN_ID);
	});

	it("parses hasArt=false rows so the Ancient relics render a placeholder, not a broken image", () => {
		const entries = parseEquipment([HEADER, ROW_NO_ART].join("\n"));
		expect(entries[0].hasArt).toBe(false);
	});

	it("strips CRLF line endings so the trailing hasArt column stays clean", () => {
		// Regression guard: splitting on "\n" alone leaves a trailing "\r" on the last column, turning "true" into "true\r", which fails the === "true" check and renders every icon as missing.
		const crlf = [HEADER, ROW_GEAR].join("\r\n");
		expect(parseEquipment(crlf)[0].hasArt).toBe(true);
	});

	it("drops blank, short, and corrupted rows instead of emitting junk entries", () => {
		const messy = [HEADER, ROW_GEAR, "", "weapon,2", "pet,2,2H Axe,1,X,Y,url,true", "weapon,NaN,2H Axe,zzz,X,Y,url,true"].join("\n");
		const entries = parseEquipment(messy);
		expect(entries).toHaveLength(1);
		expect(entries[0].enumName).toBe("GORE_AXE");
	});
});

describe("loadEquipment", () => {
	it("merges both CSVs and reports gear and visage counts on success", async () => {
		const result = await loadEquipment([
			async () => [HEADER, ROW_GEAR].join("\n"),
			async () => [HEADER, ROW_VISAGE].join("\n"),
		]);
		expect(result.entries).toHaveLength(2);
		expect(result.status).toContain("2 items");
		expect(result.status).toContain("1 gear");
		expect(result.status).toContain("1 visages");
	});

	it("turns a fetch rejection into an error status instead of throwing", async () => {
		// Regression guard: without a catch, a failed CSV fetch is an unhandled rejection and the UI sits on "loading equipment..." forever. loadEquipment must resolve with an empty list and a visible failure status.
		const result = await loadEquipment([
			async () => {
				throw new Error("network down");
			},
		]);
		expect(result.entries).toEqual([]);
		expect(result.status).toContain("equipment failed to load");
		expect(result.status).toContain("network down");
	});
});
