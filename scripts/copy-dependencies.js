#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

function ensureDirSync(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function copyDir(src, dest) {
  ensureDirSync(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });

  // Файлы и папки, которые нужно исключить
  const excludePatterns = [
    ".package-lock.json",
    "package-lock.json",
    ".npm",
    "npm-debug.log*",
    ".DS_Store",
    "Thumbs.db",
    "*.log",
    "*.tmp",
    ".git*",
    "node_modules/.cache",
    "node_modules/.bin",
    ".cache",
    ".bin",
    "*.lock",
    "*.pid",
    "*.seed",
    "*.pid.lock",
    ".eslintcache",
    ".nyc_output",
    "coverage",
    ".nyc_output",
    "node_modules/.hooks",
    "node_modules/.modules",
    "node_modules/.yarn",
  ];

  for (const entry of entries) {
    // Проверяем, нужно ли исключить файл/папку
    const shouldExclude = excludePatterns.some((pattern) => {
      if (pattern.includes("*")) {
        const regex = new RegExp(pattern.replace(/\*/g, ".*"));
        return regex.test(entry.name);
      }
      return entry.name === pattern;
    });

    if (shouldExclude) {
      continue;
    }

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      try {
        fs.copyFileSync(srcPath, destPath);
      } catch (error) {
        // Игнорируем ошибки копирования для системных файлов
        if (
          !error.message.includes("EACCES") &&
          !error.message.includes("EPERM")
        ) {
          console.warn(
            `⚠️  Warning: Could not copy ${entry.name}: ${error.message}`
          );
        }
      }
    }
  }
}

function main() {
  const projectRoot = process.cwd();
  const tempDir = path.join(projectRoot, "build-deps");
  const targetNodeModules = path.join(tempDir, "node_modules");

  // Clean previous
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  ensureDirSync(tempDir);

  // Copy current node_modules to build-deps/node_modules
  const projectNodeModules = path.join(projectRoot, "node_modules");
  if (!fs.existsSync(projectNodeModules)) {
    console.error("❌ node_modules not found. Please run npm install first.");
    process.exit(1);
  }
  console.log("📁 Copying node_modules to build-deps...");
  copyDir(projectNodeModules, targetNodeModules);

  console.log("✅ Dependencies copied to build-deps/node_modules");
}

main();
