// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import EquipmentTile from "../../src/components/Equipment/EquipmentTile";
import type { EquipmentEntry } from "../../src/types/equipment";

// Vitest does not auto-run React Testing Library's cleanup without globals enabled, so unmount between tests by hand or each render leaks its DOM into the next assertion.
afterEach(cleanup);

const GORE_AXE: EquipmentEntry = {
	category: "weapon",
	equipmentType: 2,
	equipmentTypeName: "2H Axe",
	displayId: 1,
	enumName: "GORE_AXE",
	name: "Gore Axe",
	imageUrl: "https://example.test/weapon/2-1.png",
	hasArt: true,
	isVisage: false,
};

const ANCIENT_SHIELD: EquipmentEntry = {
	category: "accessory",
	equipmentType: 2,
	equipmentTypeName: "Shield",
	displayId: 0,
	enumName: "ANCIENT_SHIELD",
	name: "Ancient Shield",
	imageUrl: "https://example.test/accessory/2-0.png",
	hasArt: false,
	isVisage: false,
};

const KARATE_GI: EquipmentEntry = {
	category: "armor",
	equipmentType: 1,
	equipmentTypeName: "Light",
	displayId: 50001,
	enumName: "KARATE_GI",
	name: "Karate Gi",
	imageUrl: "https://example.test/armor/1-50001.png",
	hasArt: true,
	isVisage: true,
};

describe("EquipmentTile", () => {
	it("renders the icon, name, and type plus id line", () => {
		render(<EquipmentTile entry={GORE_AXE} />);
		expect(screen.getByRole("img", { name: "Gore Axe" })).toHaveAttribute("src", GORE_AXE.imageUrl);
		expect(screen.getByText("Gore Axe")).toBeInTheDocument();
		expect(screen.getByText("2H Axe #1")).toBeInTheDocument();
	});

	it("renders a labeled placeholder instead of a broken image when the art is missing", () => {
		// Regression guard: the id-0 Ancient relics have no CDN art (hasArt=false). An <img> pointed at their 404 URL paints a broken-image box; the tile must swap in the placeholder and never request the URL.
		render(<EquipmentTile entry={ANCIENT_SHIELD} />);
		expect(screen.getByRole("img", { name: "Ancient Shield (no art)" })).toBeInTheDocument();
		expect(document.querySelector("img")).toBeNull();
		expect(screen.getByText("no art yet")).toBeInTheDocument();
	});

	it("offers a PNG download only when the art exists", () => {
		// The no-art relics have nothing to save; a download button there would fetch a 404 and confuse anyone collecting the set.
		const { rerender } = render(<EquipmentTile entry={GORE_AXE} />);
		expect(screen.getByRole("button", { name: "download Gore Axe PNG" })).toBeInTheDocument();
		rerender(<EquipmentTile entry={ANCIENT_SHIELD} />);
		expect(screen.queryByRole("button")).toBeNull();
	});

	it("marks visages with a badge that gear tiles do not get", () => {
		const { rerender } = render(<EquipmentTile entry={KARATE_GI} />);
		expect(screen.getByText("Visage")).toBeInTheDocument();
		rerender(<EquipmentTile entry={GORE_AXE} />);
		expect(screen.queryByText("Visage")).toBeNull();
	});
});
