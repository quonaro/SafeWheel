#!/usr/bin/env node
const { spawnSync } = require("child_process");
const path = require("path");

const platform = process.argv[2];

if (!platform || !["linux", "win32"].includes(platform)) {
  console.error(
    "❌ Использование: node scripts/rebuild-for-platform.js <linux|win32>"
  );
  process.exit(1);
}

console.log(`🔧 Пересобираем better-sqlite3 для ${platform}...`);

const result = spawnSync(
  "npx",
  [
    "--yes",
    "electron-rebuild",
    "-f",
    "-w",
    "better-sqlite3",
    "-v",
    "32.0.0",
    "--platform",
    platform,
  ],
  {
    stdio: "inherit",
    cwd: process.cwd(),
  }
);

if (result.status !== 0) {
  console.error(`❌ Ошибка пересборки для ${platform}`);
  process.exit(result.status);
}

console.log(`✅ better-sqlite3 успешно пересобран для ${platform}`);
