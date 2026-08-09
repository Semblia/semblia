import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const SOURCE_SCAN_TIMEOUT_MS = 20_000;

function listSourceFiles(...dirs: string[]): string[] {
  return dirs.flatMap((dir) => listSourceFilesIn(dir));
}

function listSourceFilesIn(dir: string): string[] {
  const fullDir = path.join(root, dir);
  if (!fs.existsSync(fullDir)) return [];

  return fs.readdirSync(fullDir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(fullDir, entry.name);
    const relativePath = path.relative(root, fullPath);

    if (entry.isDirectory()) {
      if (entry.name === ".next" || entry.name === "node_modules") return [];
      return listSourceFilesIn(relativePath);
    }

    if (!/\.(ts|tsx)$/.test(entry.name)) return [];
    return [relativePath.replaceAll("\\", "/")];
  });
}

function sourceIncludes(relativePath: string, pattern: RegExp) {
  return pattern.test(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

describe("live query policy", () => {
  it(
    "keeps page and component queries behind hook-level hydration helpers",
    () => {
      const directQueryFiles = listSourceFiles("app", "components").filter(
        (file) =>
          sourceIncludes(
            file,
            /import\s*\{[^}]*\buseQuery\b[^}]*\}\s*from\s*["']@tanstack\/react-query["']/,
          ),
      );

      expect(directQueryFiles).toEqual([]);
    },
    SOURCE_SCAN_TIMEOUT_MS,
  );

  it(
    "requires API hook queries to opt into shared live-query options",
    () => {
      const filesMissingLiveOptions = listSourceFiles("hooks/api").filter(
        (file) => {
          const source = fs.readFileSync(path.join(root, file), "utf8");
          const queryCount = source.match(/\buseQuery\s*\(\s*\{/g)?.length ?? 0;
          if (queryCount === 0) return false;

          const liveOptionCount =
            source.match(/\.\.\.liveQueryOptions\(options\)/g)?.length ?? 0;

          return liveOptionCount < queryCount;
        },
      );

      expect(filesMissingLiveOptions).toEqual([]);
    },
    SOURCE_SCAN_TIMEOUT_MS,
  );
});
