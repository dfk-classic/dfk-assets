// Canonical equipment shape parsed from public/gear.csv and public/visages.csv (one row per item, columns documented in the README). Mirrors the CSV columns one-for-one plus the derived isVisage flag, so the tile, filter and parser layers all share a single source of truth.

export type EquipmentCategory = "weapon" | "armor" | "accessory";

export interface EquipmentEntry {
	category: EquipmentCategory;
	// Numeric type inside the category: weaponType 1-13, armorType 1-3, or 1 accessory / 2 shield / 3 focus. Item identity on chain is the (category, equipmentType, displayId) triple; displayId alone is NOT unique (all four weapon visages share 50000).
	equipmentType: number;
	equipmentTypeName: string;
	displayId: number;
	enumName: string;
	name: string;
	imageUrl: string;
	// false for the id-0 "Ancient" relics, which exist in the game data but have no icon on the art CDN yet.
	hasArt: boolean;
	isVisage: boolean;
}
