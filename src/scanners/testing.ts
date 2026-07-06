import type { TestingInfo } from "../types.ts";
import type { ProjectIndex } from "../core/index.ts";
import type { ManifestBundle } from "../core/manifests.ts";
import { manifestExists } from "../core/manifests.ts";

const TEST_PATTERNS = [
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /_test\.go$/,
  /_test\.py$/,
  /test_.*\.py$/,
  /Test\.java$/,
  /_test\.rs$/,
];

const TEST_FRAMEWORKS: Record<string, string[]> = {
  Jest: ["jest", "@jest/core"],
  Vitest: ["vitest"],
  Mocha: ["mocha"],
  Playwright: ["@playwright/test", "playwright"],
  Cypress: ["cypress"],
  "Testing Library": ["@testing-library/react", "@testing-library/dom"],
  pytest: ["pytest"],
  RSpec: ["rspec"],
};

const COVERAGE_FILES = [
  "jest.config.js", "jest.config.ts", "vitest.config.ts", "vitest.config.js",
  ".coveragerc", "coverage.config.js", "codecov.yml", ".nycrc",
];

export function scanTesting(index: ProjectIndex, manifests: ManifestBundle, depNames: Set<string>): TestingInfo {
  const info: TestingInfo = { frameworks: [], testFiles: 0, coverageConfig: false };

  info.testFiles = index.files.filter((f) => TEST_PATTERNS.some((p) => p.test(f.name))).length;

  for (const [framework, deps] of Object.entries(TEST_FRAMEWORKS)) {
    if (deps.some((d) => depNames.has(d))) info.frameworks.push(framework);
  }

  const pkg = manifests.packageJson as { scripts?: Record<string, string> } | null;
  if (pkg?.scripts) {
    if (Object.values(pkg.scripts).some((s) => /jest|vitest|mocha|playwright|cypress/i.test(s))) {
      if (!info.frameworks.length) info.frameworks.push("detected via scripts");
    }
  }

  info.coverageConfig = COVERAGE_FILES.some((f) => manifestExists(manifests, f));
  return info;
}
