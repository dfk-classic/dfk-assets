// Registers jest-dom's custom matchers (toBeInTheDocument, toHaveAttribute, ...) on vitest's expect for every test file. The import only extends expect and touches no DOM globals, so it is safe to load under the default node environment as well as under the jsdom component tests.
import "@testing-library/jest-dom/vitest";
