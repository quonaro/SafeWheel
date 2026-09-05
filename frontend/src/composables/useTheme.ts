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

function withoutTransitions(action: () => void) {
  const style = document.createElement("style");
  style.textContent = "* { transition: none !important; }";
  document.head.appendChild(style);

  action();

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      style.remove();
    });
  });
}

applyTheme(theme.value);

watch(theme, (value) => {
  localStorage.setItem(STORAGE_KEY, value);
  withoutTransitions(() => applyTheme(value));
});

export function useTheme() {
  function toggleTheme() {
    theme.value = theme.value === "dark" ? "light" : "dark";
  }

  return { theme, toggleTheme };
}
