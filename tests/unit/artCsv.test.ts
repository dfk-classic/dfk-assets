import { describe, it, expect } from "vitest";
import { parseArtCsv, loadArt } from "../../src/artCsv";

const HEADER = "slug,name,file";
const NPC_ROW = "druid,Druid,npcs/druid.gif";
const ITEM_ROW = "ambertaffy,Ambertaffy,https://defi-kingdoms.b-cdn.net/art-assets/items/ambertaffy.png";
const resolve = (p: string) => "/dfk-assets/" + p;

describe("parseArtCsv", () => {
	it("skips the header and resolves relative paths through the injected resolver", () => {
		expect(parseArtCsv([HEADER, NPC_ROW].join("\n"), resolve)).toEqual([
			{ slug: "druid", name: "Druid", imageUrl: "/dfk-assets/npcs/druid.gif" },
		]);
	});

	it("passes absolute URLs through untouched", () => {
		// Item rows carry stable CDN URLs; prefixing those with BASE_URL would break every item image, so only relative paths go through the resolver.
		expect(parseArtCsv([HEADER, ITEM_ROW].join("\n"), resolve)).toEqual([
			{ slug: "ambertaffy", name: "Ambertaffy", imageUrl: "https://defi-kingdoms.b-cdn.net/art-assets/items/ambertaffy.png" },
		]);
	});

	it("drops blank, short, and empty-field rows instead of emitting junk tiles", () => {
		const messy = [HEADER, NPC_ROW, "", "only-slug", "a,,missing-name"].join("\n");
		expect(parseArtCsv(messy, resolve)).toHaveLength(1);
	});

	it("strips CRLF line endings so the file column stays clean", () => {
		// Regression guard: a trailing \r on the path column would produce "npcs/druid.gif\r", a URL that 404s for an invisible reason.
		const crlf = [HEADER, NPC_ROW].join("\r\n");
		expect(parseArtCsv(crlf, resolve)[0].imageUrl).toBe("/dfk-assets/npcs/druid.gif");
	});
});

describe("loadArt", () => {
	it("reports entries and a count status on success", async () => {
		const result = await loadArt("NPCs", async () => [HEADER, NPC_ROW].join("\n"), resolve);
		expect(result.entries).toHaveLength(1);
		expect(result.status).toContain("NPCs loaded: 1");
	});

	it("turns a fetch rejection into an error status instead of throwing", async () => {
		const result = await loadArt("items", async () => {
			throw new Error("network down");
		});
		expect(result.entries).toEqual([]);
		expect(result.status).toContain("items failed to load");
		expect(result.status).toContain("network down");
	});
});
