#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const version = process.argv[2];
const help = !version || version === "-h" || version === "--help";

if (help) {
  console.log("Usage: node scripts/bump-desktop-version.mjs <version>");
  console.log("Example: node scripts/bump-desktop-version.mjs 26.2.0");
  process.exit(version ? 0 : 1);
}

const semverLikePattern =
  /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

if (!semverLikePattern.test(version)) {
  console.error(`Invalid version: ${version}`);
  console.error("Expected format: x.y.z (supports prerelease/build metadata)");
  process.exit(1);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");

const targets = [
  { path: "packages/auk-desktop/package.json", type: "json" },
  { path: "packages/auk-cli/package.json", type: "json" },
  { path: "packages/auk-desktop/src-tauri/Cargo.toml", type: "cargo-toml" },
  { path: "packages/auk-desktop/src-tauri/tauri.conf.json", type: "json" },
  { path: "packages/auk-desktop/src-tauri/tauri.portable.macos.conf.json", type: "json" },
  { path: "packages/auk-desktop/src-tauri/tauri.portable.windows.conf.json", type: "json" },
];

function updateJsonVersion(filePath, nextVersion) {
  const content = fs.readFileSync(filePath, "utf8");
  const match = content.match(/^(\s*"version"\s*:\s*")([^"]+)(".*)$/m);

  if (!match) {
    throw new Error(`Missing version field in ${filePath}`);
  }

  const prevVersion = match[2];
  const nextContent = content.replace(
    /^(\s*"version"\s*:\s*")([^"]+)(".*)$/m,
    `$1${nextVersion}$3`,
  );

  return { prevVersion, nextContent };
}

function updateCargoPackageVersion(filePath, nextVersion) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  let inPackageSection = false;
  let replaced = false;
  let prevVersion = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const section = line.trim();

    if (section === "[package]") {
      inPackageSection = true;
      continue;
    }

    if (inPackageSection && /^\[.+\]$/.test(section)) {
      break;
    }

    if (inPackageSection) {
      const match = line.match(/^(\s*version\s*=\s*)"(.*)"(\s*)$/);
      if (match) {
        prevVersion = match[2];
        lines[i] = `${match[1]}"${nextVersion}"${match[3]}`;
        replaced = true;
        break;
      }
    }
  }

  if (!replaced || prevVersion === null) {
    throw new Error(`Failed to find [package] version in ${filePath}`);
  }

  return { prevVersion, nextContent: lines.join("\n") };
}

const changes = [];
const changedFiles = [];

for (const target of targets) {
  const absolutePath = path.resolve(repoRoot, target.path);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${target.path}`);
  }

  const updater =
    target.type === "json" ? updateJsonVersion : updateCargoPackageVersion;
  const { prevVersion, nextContent } = updater(absolutePath, version);
  const currentContent = fs.readFileSync(absolutePath, "utf8");

  if (currentContent !== nextContent) {
    fs.writeFileSync(absolutePath, nextContent, "utf8");
    changedFiles.push(target.path);
  }

  changes.push({ file: target.path, before: prevVersion, after: version });
}

console.log("Desktop/CLI versions updated:");
for (const item of changes) {
  console.log(`- ${item.file}: ${item.before} -> ${item.after}`);
}

console.log(`\nSuggested git tag: v${version}`);

if (changedFiles.length > 0) {
  console.log("\nFiles changed:");
  for (const file of changedFiles) {
    console.log(`- ${file}`);
  }

  console.log("\nSuggested command:");
  console.log(`git add ${changedFiles.join(" ")}`);
} else {
  console.log("\nNo file content changed.");
}
