import { ref, watch } from "vue";

type Theme = "light" | "dark";

const STORAGE_KEY = "safe-wheel-theme";

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

const theme = ref<Theme>(getInitialTheme());

function applyTheme(value: Theme) {
  document.documentElement.classList.toggle("dark", value === "dark");
}

applyTheme(theme.value);

watch(theme, (value) => {
  localStorage.setItem(STORAGE_KEY, value);
  applyTheme(value);
});

export function useTheme() {
  function toggleTheme() {
    theme.value = theme.value === "dark" ? "light" : "dark";
  }

  return { theme, toggleTheme };
}
