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
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
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
