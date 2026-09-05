<script setup lang="ts">
import { cn } from "@/lib/utils";

const props = defineProps<{
  class?: string;
  modelValue?: string;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

function onInput(e: Event) {
  const target = e.target as HTMLTextAreaElement;
  emit("update:modelValue", target.value);
}
</script>

<template>
  <textarea
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :rows="rows || 3"
    :class="
      cn(
        'flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        props.class,
      )
    "
    @input="onInput"
  />
</template>
