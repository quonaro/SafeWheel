<script setup lang="ts">
import { nextTick, ref } from "vue";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

const props = defineProps<{
  target: () => HTMLInputElement | HTMLTextAreaElement | null | undefined;
}>();

const emit = defineEmits<{
  edit: [value: string];
}>();

const hasSelection = ref(false);
const hasText = ref(false);
const isEditable = ref(true);

function onOpenChange(open: boolean) {
  if (!open) return;
  const el = props.target();
  if (!el) return;
  hasSelection.value = (el.selectionEnd ?? 0) > (el.selectionStart ?? 0);
  hasText.value = el.value.length > 0;
  isEditable.value = !el.disabled && !el.readOnly;
}

async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

async function onCopy() {
  const el = props.target();
  if (!el) return;
  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? 0;
  if (end <= start) return;
  if (!(await writeClipboard(el.value.slice(start, end)))) {
    el.focus();
    document.execCommand("copy");
  }
}

async function onCut() {
  const el = props.target();
  if (!el || el.disabled || el.readOnly) return;
  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? 0;
  if (end <= start) return;
  await writeClipboard(el.value.slice(start, end));
  replaceSelection(el, "");
}

async function onPaste() {
  const el = props.target();
  if (!el || el.disabled || el.readOnly) return;
  try {
    const text = await navigator.clipboard.readText();
    replaceSelection(el, text);
  } catch {
    el.focus();
    document.execCommand("paste");
  }
}

function onSelectAll() {
  const el = props.target();
  if (!el) return;
  el.focus();
  el.select();
}

function replaceSelection(
  el: HTMLInputElement | HTMLTextAreaElement,
  text: string,
) {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  const value = el.value.slice(0, start) + text + el.value.slice(end);
  const cursor = start + text.length;
  el.value = value;
  emit("edit", value);
  nextTick(() => {
    el.focus();
    el.setSelectionRange(cursor, cursor);
  });
}
</script>

<template>
  <ContextMenu @update:open="onOpenChange">
    <ContextMenuTrigger as-child>
      <slot />
    </ContextMenuTrigger>
    <ContextMenuContent>
      <ContextMenuItem :disabled="!hasSelection || !isEditable" @select="onCut">
        Вырезать
        <span class="ml-auto pl-4 text-xs text-muted-foreground">Ctrl+X</span>
      </ContextMenuItem>
      <ContextMenuItem :disabled="!hasSelection" @select="onCopy">
        Копировать
        <span class="ml-auto pl-4 text-xs text-muted-foreground">Ctrl+C</span>
      </ContextMenuItem>
      <ContextMenuItem :disabled="!isEditable" @select="onPaste">
        Вставить
        <span class="ml-auto pl-4 text-xs text-muted-foreground">Ctrl+V</span>
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem :disabled="!hasText" @select="onSelectAll">
        Выделить всё
        <span class="ml-auto pl-4 text-xs text-muted-foreground">Ctrl+A</span>
      </ContextMenuItem>
    </ContextMenuContent>
  </ContextMenu>
</template>
