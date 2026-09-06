import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const wailsConfig = JSON.parse(
  readFileSync(new URL("../wails.json", import.meta.url), "utf-8"),
);

// Version shown in the UI: git tag (e.g. "v3.0.0" or "v3.0.0-2-gabc123-dirty"
// between releases). Falls back to wails.json productVersion when there are
// no tags or git is unavailable. Keep release tags in sync with
// info.productVersion — the NSIS installer reads it statically.
function resolveAppVersion(): string {
  try {
    return execSync("git describe --tags --dirty", {
      cwd: repoRoot,
      stdio: ["pipe", "pipe", "ignore"],
    })
      .toString()
      .trim()
      .replace(/^v/, "");
  } catch {
    return wailsConfig.info.productVersion;
  }
}

export default defineConfig({
  plugins: [vue(), vueDevTools(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(resolveAppVersion()),
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
