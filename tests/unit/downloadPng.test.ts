// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { pngFileName, downloadPng } from "../../src/downloadPng";

const KARATE_GI = {
	name: "Karate Gi",
	displayId: 50001,
	imageUrl: "https://example.test/armor/1-50001.png",
};

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

describe("pngFileName", () => {
	it("slugs the display name and appends the displayId", () => {
		expect(pngFileName(KARATE_GI)).toBe("karate-gi-50001.png");
	});

	it("collapses punctuation runs and never leaves leading or trailing hyphens", () => {
		// Names carry apostrophes and colon-space runs ("Miner's Pickaxe", "Super Blub Defender: Red Suit"); each punctuation run must become one hyphen, not several, and the slug must not start or end with one.
		expect(pngFileName({ name: "Miner's Pickaxe", displayId: 50000 })).toBe("miners-pickaxe-50000.png");
		expect(pngFileName({ name: "Super Blub Defender: Red Suit", displayId: 50002 })).toBe("super-blub-defender-red-suit-50002.png");
		expect(pngFileName({ name: "Stick n' String", displayId: 2 })).toBe("stick-n-string-2.png");
	});
});

describe("downloadPng", () => {
	it("downloads the fetched blob through an object-URL anchor named after the item", async () => {
		// jsdom implements neither createObjectURL nor anchor-click navigation, so both are stubbed; the assertions pin the wiring: blob in, object URL on the anchor, slug filename, click, deferred revoke.
		vi.useFakeTimers();
		vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, blob: async () => new Blob(["png"]) })));
		const createObjectURL = vi.fn(() => "blob:fake-url");
		const revokeObjectURL = vi.fn();
		URL.createObjectURL = createObjectURL;
		URL.revokeObjectURL = revokeObjectURL;
		let clicked: { href: string; download: string } | undefined;
		vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
			clicked = { href: this.href, download: this.download };
		});

		await downloadPng(KARATE_GI);

		expect(createObjectURL).toHaveBeenCalledOnce();
		expect(clicked).toEqual({ href: "blob:fake-url", download: "karate-gi-50001.png" });
		// Regression guard: revoking synchronously after click() aborts Chrome's in-flight download (a stray .tmp instead of the file); the revoke must run on the delay, not before.
		expect(revokeObjectURL).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1000);
		expect(revokeObjectURL).toHaveBeenCalledWith("blob:fake-url");
	});

	it("falls back to opening the image URL in a new tab when the fetch fails", async () => {
		// Regression guard: with no catch, an offline user clicking Download gets an unhandled rejection and nothing else. The fallback must hand the original CDN URL to window.open so the PNG is still reachable.
		vi.stubGlobal("fetch", vi.fn(async () => {
			throw new Error("offline");
		}));
		const open = vi.fn();
		vi.stubGlobal("open", open);

		await downloadPng(KARATE_GI);

		expect(open).toHaveBeenCalledWith(KARATE_GI.imageUrl, "_blank", "noopener");
	});
});
