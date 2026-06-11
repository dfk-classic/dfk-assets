// The asset sections behind the top navbar. Hash-addressed (#items, #npcs, ...) so section links are shareable and the back button works without pulling in a router dependency. The hero viewer is its own deployed app, so it rides along as an external link rather than a section.
export const SECTIONS = [
	{ key: "equipment", label: "Equipment" },
	{ key: "items", label: "Items" },
	{ key: "npcs", label: "NPCs" },
	{ key: "monsters", label: "Monsters" },
] as const;

export type SectionKey = (typeof SECTIONS)[number]["key"];

export const HERO_VIEWER_URL = "https://gen-a.dev/dfk-hero-viewer/";

// Resolve a location hash to a section, defaulting to equipment for an empty or unknown hash so a stale or mistyped link still lands somewhere sensible.
export function sectionFromHash(hash: string): SectionKey {
	const key = hash.replace(/^#/, "");
	const found = SECTIONS.find((s) => s.key === key);
	return found ? found.key : "equipment";
}
