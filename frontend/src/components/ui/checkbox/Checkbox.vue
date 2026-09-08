<script setup lang="ts">
import { computed } from "vue";
import { cn } from "@/lib/utils";
import { IconCheck } from "@tabler/icons-vue";

const props = defineProps<{
  class?: string;
  modelValue?: boolean;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

const checked = computed({
  get: () => !!props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

function onChange(e: Event) {
  const target = e.target as HTMLInputElement;
  emit("update:modelValue", target.checked);
}
</script>

<template>
  <label
    :class="
      cn(
        'group peer relative flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border shadow transition-colors focus-within:ring-1 focus-within:ring-ring focus-within:ring-offset-1 focus-within:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
        checked
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-input bg-background text-transparent',
        props.class,
      )
    "
  >
    <input
      v-model="checked"
      type="checkbox"
      class="peer sr-only"
      :disabled="disabled"
      @change="onChange"
    />
    <IconCheck class="h-3.5 w-3.5" />
  </label>
</template>
