#!/usr/bin/env node
/**
 * Usage: node scripts/add-changelog.js <version> <type> <highlight1> [highlight2] ...
 * Types: feature | fix | performance | security
 *
 * Example:
 *   node scripts/add-changelog.js 1.6.0 feature "Dark mode" "Performance improvements"
 */

const fs = require("fs");
const path = require("path");

const [, , version, type, ...highlights] = process.argv;

if (!version || !type || highlights.length === 0) {
  console.error("Usage: node scripts/add-changelog.js <version> <type> <highlight1> [highlight2] ...");
  process.exit(1);
}

const VALID_TYPES = ["feature", "fix", "performance", "security"];
if (!VALID_TYPES.includes(type)) {
  console.error(`Type must be one of: ${VALID_TYPES.join(", ")}`);
  process.exit(1);
}

const changelogPath = path.join(__dirname, "../src/data/changelog.json");
const releases = JSON.parse(fs.readFileSync(changelogPath, "utf8"));

const date = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

const entry = { version, date, highlights, type };

// Prepend — newest first
releases.unshift(entry);

fs.writeFileSync(changelogPath, JSON.stringify(releases, null, 2) + "\n");
console.log(`✓ Added v${version} (${type}) to changelog`);
