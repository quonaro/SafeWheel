<script setup lang="ts">
import { computed } from "vue";
import { cn } from "@/lib/utils";

const props = defineProps<{
  class?: string;
  modelValue?: string | number | null;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  min?: string | number;
  max?: string | number;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string | number | null];
}>();

const isNumber = computed(() => props.type === "number");

// Numeric inputs accept only non-negative values
const inputMin = computed(() =>
  isNumber.value ? (props.min ?? 0) : props.min,
);

function onKeydown(e: KeyboardEvent) {
  if (!isNumber.value) return;
  // Block minus, plus and exponent so negative values can't be typed
  if (e.key === "-" || e.key === "+" || e.key === "e" || e.key === "E") {
    e.preventDefault();
  }
}

function onInput(e: Event) {
  const target = e.target as HTMLInputElement;
  if (isNumber.value) {
    // Strip negative/exponent characters that slipped through (e.g. paste)
    const sanitized = target.value.replace(/[-+eE]/g, "");
    if (sanitized !== target.value) target.value = sanitized;
    const num = parseFloat(target.value);
    const min = Number(inputMin.value ?? 0);
    if (!isNaN(num) && num < min) {
      target.value = String(min);
    }
    // Emit a real number (or null when cleared) so numeric models
    // don't turn into strings and break JSON unmarshalling in Go.
    emit(
      "update:modelValue",
      target.value === "" ? null : Number(target.value),
    );
    return;
  }
  emit("update:modelValue", target.value);
}
</script>

<template>
  <input
    :type="type || 'text'"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :min="inputMin"
    :max="max"
    :class="
      cn(
        'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        props.class,
      )
    "
    @input="onInput"
    @keydown="onKeydown"
  />
</template>
