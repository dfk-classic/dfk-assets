import type { EquipmentEntry } from "./types/equipment";

// The browse tabs. Shields are split out of the accessory category because on chain they share AccessoryCore but in the game they are a different slot, and lumping six shields in with twenty-nine accessories buries them. Gear tabs exclude visages (a Fishing Rod visage is technically a 1H Sword, but players think of visages as their own collection), which all live under the dedicated visages tab instead.
export const TABS = [
	{ key: "all", label: "All" },
	{ key: "weapons", label: "Weapons" },
	{ key: "armor", label: "Armor" },
	{ key: "accessories", label: "Accessories" },
	{ key: "shields", label: "Shields" },
	{ key: "visages", label: "Visages" },
] as const;

export type FilterTab = (typeof TABS)[number]["key"];

function inTab(entry: EquipmentEntry, tab: FilterTab): boolean {
	switch (tab) {
		case "all":
			return true;
		case "weapons":
			return entry.category === "weapon" && !entry.isVisage;
		case "armor":
			return entry.category === "armor" && !entry.isVisage;
		case "accessories":
			return entry.category === "accessory" && entry.equipmentType === 1 && !entry.isVisage;
		case "shields":
			return entry.category === "accessory" && entry.equipmentType === 2 && !entry.isVisage;
		case "visages":
			return entry.isVisage;
	}
}

// Case-insensitive match against the display name and the enum name. The enum name has its underscores spaced so "karate gi" finds KARATE_GI even though the display name of 50011 is "Champion Gi". A blank query matches everything, so the tab filter alone decides what shows.
function matchesQuery(entry: EquipmentEntry, query: string): boolean {
	const q = query.trim().toLowerCase();
	if (!q) return true;
	const haystack = `${entry.name} ${entry.enumName.replace(/_/g, " ")}`.toLowerCase();
	return haystack.includes(q);
}

export function filterEquipment(
	entries: EquipmentEntry[],
	tab: FilterTab,
	query: string,
): EquipmentEntry[] {
	return entries.filter((e) => inTab(e, tab) && matchesQuery(e, query));
}
