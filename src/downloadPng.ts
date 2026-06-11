import type { EquipmentEntry } from "./types/equipment";

// Filename for a saved icon: the display name slugged plus the displayId, so "Karate Gi" saves as karate-gi-50001.png instead of the CDN's anonymous 1-50001.png. The id stays in the name because display names alone do not identify an item (all four weapon visages differ only by type, and future items could reuse a name). Kept pure and separate from the DOM work so it can be exercised without a browser.
export function pngFileName(entry: Pick<EquipmentEntry, "name" | "displayId">): string {
	const slug = entry.name
		.toLowerCase()
		// Apostrophes are dropped, not hyphenated: "Miner's Pickaxe" should save as miners-pickaxe, not miner-s-pickaxe.
		.replace(/'/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return `${slug}-${entry.displayId}.png`;
}

// Save an item's icon to disk. The CDN sends Access-Control-Allow-Origin: *, so the image is fetched as a blob and downloaded through a temporary object-URL anchor; a plain <a download> would not work because browsers ignore the download attribute on cross-origin URLs. If the fetch fails anyway (offline, CDN hiccup, a future CORS change), fall back to opening the PNG in a new tab so the user can still save it by hand.
export async function downloadPng(
	entry: Pick<EquipmentEntry, "name" | "displayId" | "imageUrl">,
): Promise<void> {
	try {
		const res = await fetch(entry.imageUrl);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const blob = await res.blob();
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = pngFileName(entry);
		// Firefox only honors click() on anchors that are attached to the document.
		document.body.appendChild(a);
		a.click();
		a.remove();
		// Revoke on a delay: revoking synchronously after click() aborts Chrome's still-in-flight download (it leaves a .tmp in the downloads folder and never finalizes the file). A second is far more than a 60x60 icon needs while still reclaiming the object URL promptly.
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	} catch {
		window.open(entry.imageUrl, "_blank", "noopener");
	}
}
