import { ref, watch } from "vue";

export const FONT_SIZES = [14, 16, 18, 20] as const;
export type FontSize = (typeof FONT_SIZES)[number];

const STORAGE_KEY = "safe-wheel-settings";
const DEFAULT_FONT_SIZE: FontSize = 16;

function getInitialFontSize(): FontSize {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FONT_SIZE;
    const parsed = JSON.parse(raw) as { fontSize?: unknown };
    return FONT_SIZES.includes(parsed.fontSize as FontSize)
      ? (parsed.fontSize as FontSize)
      : DEFAULT_FONT_SIZE;
  } catch {
    return DEFAULT_FONT_SIZE;
  }
}

const fontSize = ref<FontSize>(getInitialFontSize());

function applyFontSize(value: number) {
  document.documentElement.style.fontSize = `${value}px`;
}

applyFontSize(fontSize.value);

watch(fontSize, (value) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ fontSize: value }));
  } catch {
    // Ignore storage errors (e.g. private mode).
  }
  applyFontSize(value);
});

export function useSettings() {
  return { fontSize, FONT_SIZES };
}
