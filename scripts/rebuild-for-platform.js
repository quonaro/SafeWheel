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

// Сначала пересобираем в основной node_modules
console.log(`🔧 Пересобираем better-sqlite3 в node_modules для ${platform}...`);
const result1 = spawnSync(
  "npx",
  [
    "--yes",
    "electron-rebuild",
    "-f",
    "-w",
    "better-sqlite3",
    "-v",
    "32.3.3",
    "--platform",
    platform,
    "--arch",
    "x64",
  ],
  {
    stdio: "inherit",
    cwd: process.cwd(),
  }
);

if (result1.status !== 0) {
  console.error(`❌ Ошибка пересборки в node_modules для ${platform}`);
  process.exit(result1.status);
}

// Копируем пересобранный модуль в build-deps
console.log(`🔧 Копируем пересобранный better-sqlite3 в build-deps/node_modules...`);
const fs = require("fs");

const sourceDir = path.join(process.cwd(), "node_modules", "better-sqlite3");
const targetDir = path.join(process.cwd(), "build-deps", "node_modules", "better-sqlite3");

if (fs.existsSync(sourceDir)) {
  // Удаляем старую версию
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
  
  // Копируем новую версию
  fs.cpSync(sourceDir, targetDir, { recursive: true });
  console.log(`✅ better-sqlite3 скопирован в build-deps/node_modules`);
} else {
  console.error(`❌ Исходный модуль better-sqlite3 не найден в node_modules`);
  process.exit(1);
}

console.log(`✅ better-sqlite3 успешно пересобран для ${platform}`);
