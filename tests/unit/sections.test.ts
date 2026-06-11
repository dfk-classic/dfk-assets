import { describe, it, expect } from "vitest";
import { sectionFromHash, SECTIONS } from "../../src/sections";

describe("sectionFromHash", () => {
	it("maps each section hash to its key, with or without the leading #", () => {
		for (const s of SECTIONS) {
			expect(sectionFromHash("#" + s.key)).toBe(s.key);
			expect(sectionFromHash(s.key)).toBe(s.key);
		}
	});

	it("falls back to equipment for empty or unknown hashes", () => {
		// A stale shared link (a removed section, a typo) must land on the default view, not a blank page.
		expect(sectionFromHash("")).toBe("equipment");
		expect(sectionFromHash("#")).toBe("equipment");
		expect(sectionFromHash("#weapons-of-yore")).toBe("equipment");
	});
});
