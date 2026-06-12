// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import ArtTile from "../../src/components/Gallery/ArtTile";

// Vitest does not auto-run React Testing Library's cleanup without globals enabled, so unmount between tests by hand or each render leaks its DOM into the next assertion.
afterEach(cleanup);

const DRUID = { slug: "druid", name: "Druid", imageUrl: "/dfk-assets/npcs/druid.gif" };

describe("ArtTile", () => {
	it("renders the image, name, and a download button", () => {
		render(<ArtTile entry={DRUID} />);
		expect(screen.getByRole("img", { name: "Druid" })).toHaveAttribute("src", DRUID.imageUrl);
		expect(screen.getByText("Druid")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "download Druid image" })).toBeInTheDocument();
	});

	it("shows the location note only when the entry has one", () => {
		const { rerender } = render(<ArtTile entry={{ ...DRUID, note: "Gardens, Crystalvale" }} />);
		expect(screen.getByText("Gardens, Crystalvale")).toBeInTheDocument();
		rerender(<ArtTile entry={DRUID} />);
		expect(screen.queryByText("Gardens, Crystalvale")).toBeNull();
	});
});
