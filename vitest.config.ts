import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		// Pure logic tests run in the fast node environment by default; component tests opt into a DOM per file with a `// @vitest-environment jsdom` pragma so only the tests that need one pay for it. include covers .tsx so those component tests are collected alongside the .ts ones, and setupFiles registers the jest-dom matchers (toBeInTheDocument, toHaveAttribute, ...) for every test.
		environment: "node",
		include: ["tests/**/*.test.{ts,tsx}"],
		setupFiles: ["tests/setup.ts"],
	},
});
