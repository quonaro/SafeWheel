<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import {
  IconClock,
  IconChevronDown,
  IconChevronUp,
  IconX,
} from "@tabler/icons-vue";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

const props = withDefaults(
  defineProps<{
    /** Время в секундах. null — время не задано. */
    modelValue?: number | null;
    placeholder?: string;
    disabled?: boolean;
    class?: string;
  }>(),
  {
    modelValue: null,
    placeholder: "MM:SS",
    disabled: false,
  },
);

const emit = defineEmits<{ "update:modelValue": [value: number | null] }>();

const open = ref(false);
const mm = ref("");
const ss = ref("");
const mmInput = ref<HTMLInputElement | null>(null);
const ssInput = ref<HTMLInputElement | null>(null);

const displayText = computed(() => {
  if (props.modelValue == null) return "";
  const total = Math.max(0, Math.floor(props.modelValue));
  const m = Math.min(99, Math.floor(total / 60));
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
});

function syncFromModel() {
  if (props.modelValue == null) {
    mm.value = "";
    ss.value = "";
  } else {
    const total = Math.max(0, Math.floor(props.modelValue));
    mm.value = String(Math.min(99, Math.floor(total / 60))).padStart(2, "0");
    ss.value = String(total % 60).padStart(2, "0");
  }
}

watch(open, (isOpen) => {
  if (isOpen) {
    syncFromModel();
    nextTick(() => {
      mmInput.value?.focus();
      mmInput.value?.select();
    });
  } else {
    normalizePartial();
  }
});

function isComplete(): boolean {
  return mm.value.length === 2 && ss.value.length === 2;
}

function commit() {
  const m = parseInt(mm.value || "0", 10) || 0;
  const s = parseInt(ss.value || "0", 10) || 0;
  emit("update:modelValue", m * 60 + s);
}

/** Дописывает неполные значения ("1" → "01", "01:2" → "01:02") при закрытии. */
function normalizePartial() {
  if (mm.value === "" && ss.value === "") return;
  mm.value = mm.value.padStart(2, "0");
  ss.value = ss.value.padStart(2, "0");
  commit();
}

function step(field: "mm" | "ss", delta: number) {
  const max = field === "mm" ? 99 : 59;
  const cur = parseInt(field === "mm" ? mm.value : ss.value, 10) || 0;
  const next = Math.min(max, Math.max(0, cur + delta));
  const padded = String(next).padStart(2, "0");
  if (field === "mm") mm.value = padded;
  else ss.value = padded;
  commitIfComplete();
}

function commitIfComplete() {
  if (isComplete()) commit();
}

function onKeydown(e: KeyboardEvent, field: "mm" | "ss") {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === "ArrowUp") {
    e.preventDefault();
    step(field, 1);
    return;
  }
  if (e.key === "ArrowDown") {
    e.preventDefault();
    step(field, -1);
    return;
  }
  if (e.key === "Enter") {
    e.preventDefault();
    normalizePartial();
    open.value = false;
    return;
  }
  const allowed = [
    "Backspace",
    "Delete",
    "Tab",
    "ArrowLeft",
    "ArrowRight",
    "Home",
    "End",
  ];
  if (allowed.includes(e.key)) return;
  // Разрешаем только цифры — никаких произвольных символов.
  if (!/^[0-9]$/.test(e.key)) {
    e.preventDefault();
  }
}

function onSegmentInput(e: Event, field: "mm" | "ss") {
  const el = e.target as HTMLInputElement;
  const digits = el.value.replace(/\D/g, "").slice(0, 2);
  el.value = digits;
  if (field === "mm") {
    mm.value = digits;
    if (digits.length === 2) {
      nextTick(() => ssInput.value?.focus());
    }
  } else {
    let v = digits;
    if (parseInt(v, 10) > 59) v = "59";
    el.value = v;
    ss.value = v;
    if (digits.length === 2) {
      commitIfComplete();
    }
  }
}

function onPaste(e: ClipboardEvent) {
  e.preventDefault();
  const digits = (e.clipboardData?.getData("text") || "")
    .replace(/\D/g, "")
    .slice(0, 4);
  if (digits.length === 0) return;
  mm.value = digits.slice(0, 2);
  ss.value = digits.slice(2).padEnd(2, "0").slice(0, 2);
  commitIfComplete();
}

function clear() {
  mm.value = "";
  ss.value = "";
  emit("update:modelValue", null);
  open.value = false;
}

function onOpenAutoFocus(e: Event) {
  e.preventDefault();
  nextTick(() => {
    mmInput.value?.focus();
    mmInput.value?.select();
  });
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child :disabled="disabled">
      <button
        type="button"
        :disabled="disabled"
        :class="
          cn(
            'flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
            props.class,
          )
        "
      >
        <IconClock class="h-4 w-4 shrink-0 text-muted-foreground" />
        <span
          :class="cn(displayText ? 'text-foreground' : 'text-muted-foreground')"
        >
          {{ displayText || placeholder }}
        </span>
      </button>
    </PopoverTrigger>
    <PopoverContent
      class="w-auto p-3"
      align="center"
      :side-offset="4"
      @open-auto-focus="onOpenAutoFocus"
    >
      <div class="flex flex-col gap-3">
        <div class="flex items-end justify-center gap-2">
          <div class="flex flex-col items-center gap-1">
            <button
              type="button"
              class="flex h-7 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              :disabled="disabled"
              tabindex="-1"
              title="Увеличить минуты"
              @click="step('mm', 1)"
            >
              <IconChevronUp class="h-4 w-4" />
            </button>
            <input
              ref="mmInput"
              v-model="mm"
              type="text"
              inputmode="numeric"
              autocomplete="off"
              maxlength="2"
              aria-label="Минуты"
              class="h-10 w-12 rounded-md border border-input bg-transparent text-center text-lg font-semibold shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
              @keydown="(e) => onKeydown(e, 'mm')"
              @input="(e) => onSegmentInput(e, 'mm')"
              @paste="onPaste"
            />
            <button
              type="button"
              class="flex h-7 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              :disabled="disabled"
              tabindex="-1"
              title="Уменьшить минуты"
              @click="step('mm', -1)"
            >
              <IconChevronDown class="h-4 w-4" />
            </button>
            <span class="text-[10px] text-muted-foreground">мин</span>
          </div>

          <span class="pb-7 text-lg font-semibold text-muted-foreground"
            >:</span
          >

          <div class="flex flex-col items-center gap-1">
            <button
              type="button"
              class="flex h-7 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              :disabled="disabled"
              tabindex="-1"
              title="Увеличить секунды"
              @click="step('ss', 1)"
            >
              <IconChevronUp class="h-4 w-4" />
            </button>
            <input
              ref="ssInput"
              v-model="ss"
              type="text"
              inputmode="numeric"
              autocomplete="off"
              maxlength="2"
              aria-label="Секунды"
              class="h-10 w-12 rounded-md border border-input bg-transparent text-center text-lg font-semibold shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
              @keydown="(e) => onKeydown(e, 'ss')"
              @input="(e) => onSegmentInput(e, 'ss')"
              @paste="onPaste"
            />
            <button
              type="button"
              class="flex h-7 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              :disabled="disabled"
              tabindex="-1"
              title="Уменьшить секунды"
              @click="step('ss', -1)"
            >
              <IconChevronDown class="h-4 w-4" />
            </button>
            <span class="text-[10px] text-muted-foreground">сек</span>
          </div>
        </div>

        <div class="flex justify-end border-t pt-2">
          <Button
            variant="ghost"
            size="sm"
            class="h-7 px-2 text-muted-foreground"
            @click="clear"
          >
            <IconX class="h-3.5 w-3.5" />
            Очистить
          </Button>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>
