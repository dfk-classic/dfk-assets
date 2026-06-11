import { describe, it, expect } from "vitest";
import { filterEquipment, TABS } from "../../src/filterEquipment";
import type { EquipmentEntry } from "../../src/types/equipment";

function entry(overrides: Partial<EquipmentEntry>): EquipmentEntry {
	return {
		category: "weapon",
		equipmentType: 2,
		equipmentTypeName: "2H Axe",
		displayId: 1,
		enumName: "GORE_AXE",
		name: "Gore Axe",
		imageUrl: "https://example.test/weapon/2-1.png",
		hasArt: true,
		isVisage: false,
		...overrides,
	};
}

const GORE_AXE = entry({});
const KARATE_GI = entry({ category: "armor", equipmentType: 1, equipmentTypeName: "Light", displayId: 50001, enumName: "KARATE_GI", name: "Karate Gi", isVisage: true });
const CHAMPION_GI = entry({ category: "armor", equipmentType: 1, equipmentTypeName: "Light", displayId: 50011, enumName: "CHAMPIONSHIP_KARATE_GI", name: "Champion Gi", isVisage: true });
const FISHING_ROD = entry({ equipmentType: 11, equipmentTypeName: "1H Sword", displayId: 50000, enumName: "FISHING_ROD", name: "Fishing Rod", isVisage: true });
const TIN_PLATE = entry({ category: "armor", equipmentType: 3, equipmentTypeName: "Heavy", displayId: 2, enumName: "TIN_PLATE", name: "Tin Plate" });
const SHELLMET = entry({ category: "accessory", equipmentType: 1, equipmentTypeName: "Accessory", displayId: 24, enumName: "SHELLMET", name: "Shellmet" });
const REEFWALL = entry({ category: "accessory", equipmentType: 2, equipmentTypeName: "Shield", displayId: 5, enumName: "REEFWALL", name: "Reefwall" });

const ALL = [GORE_AXE, KARATE_GI, CHAMPION_GI, FISHING_ROD, TIN_PLATE, SHELLMET, REEFWALL];

describe("filterEquipment tabs", () => {
	it("shows everything under the all tab", () => {
		expect(filterEquipment(ALL, "all", "")).toHaveLength(ALL.length);
	});

	it("splits shields out of the accessory category", () => {
		// Shields share AccessoryCore on chain (category accessory, equipmentType 2) but are their own slot in game; each must appear under exactly one of the two tabs.
		expect(filterEquipment(ALL, "accessories", "")).toEqual([SHELLMET]);
		expect(filterEquipment(ALL, "shields", "")).toEqual([REEFWALL]);
	});

	it("keeps visages out of the gear tabs and together under visages", () => {
		// The Fishing Rod visage is a 1H Sword by type; it must show under visages, not weapons, or the weapon tab mixes two collections and the visage tab is incomplete.
		expect(filterEquipment(ALL, "weapons", "")).toEqual([GORE_AXE]);
		expect(filterEquipment(ALL, "armor", "")).toEqual([TIN_PLATE]);
		expect(filterEquipment(ALL, "visages", "")).toEqual([KARATE_GI, CHAMPION_GI, FISHING_ROD]);
	});

	it("covers every entry exactly once across the non-all tabs", () => {
		const nonAll = TABS.map((t) => t.key).filter((k) => k !== "all");
		const counts = ALL.map((e) => nonAll.filter((k) => filterEquipment([e], k, "").length).length);
		expect(counts).toEqual(ALL.map(() => 1));
	});
});

describe("filterEquipment query", () => {
	it("matches the display name case-insensitively", () => {
		expect(filterEquipment(ALL, "all", "tin pl")).toEqual([TIN_PLATE]);
		expect(filterEquipment(ALL, "all", "REEF")).toEqual([REEFWALL]);
	});

	it("matches the enum name with underscores spaced", () => {
		// 50011's display name is "Champion Gi", so "karate gi" only finds it through CHAMPIONSHIP_KARATE_GI; the enum name is part of the searchable text for exactly this case.
		expect(filterEquipment(ALL, "all", "karate gi")).toEqual([KARATE_GI, CHAMPION_GI]);
	});

	it("combines the tab and the query", () => {
		expect(filterEquipment(ALL, "weapons", "karate")).toEqual([]);
		expect(filterEquipment(ALL, "visages", "fishing")).toEqual([FISHING_ROD]);
	});

	it("treats a blank query as match-all", () => {
		expect(filterEquipment(ALL, "all", "   ")).toHaveLength(ALL.length);
	});
});
