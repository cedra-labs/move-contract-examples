import fs from "fs";
import path from "path";

/* =====================================================
   TYPES
===================================================== */

export type WalkedFile = {
  fullPath: string;
  relPath: string;
};

/* =====================================================
   IGNORE RULES
===================================================== */

const IGNORED_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "target",
  "out",
  ".next",
  ".turbo",
  ".github", // CI files are usually low-value for RAG
]);

const IGNORED_FILES = new Set([
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
]);

/* =====================================================
   WALK FILES (RECURSIVE)
===================================================== */

export function walkFiles(
  rootDir: string,
  currentDir = rootDir,
  acc: WalkedFile[] = []
): WalkedFile[] {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    const relPath = path.relative(rootDir, fullPath);

    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      walkFiles(rootDir, fullPath, acc);
    } else {
      if (IGNORED_FILES.has(entry.name)) continue;

      acc.push({
        fullPath,
        relPath,
      });
    }
  }

  return acc;
}
