<script setup lang="ts">
import { ref } from "vue";
import { cn } from "@/lib/utils";
import { TextFieldContextMenu } from "@/components/ui/context-menu";

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

const textareaEl = ref<HTMLTextAreaElement>();

function onInput(e: Event) {
  const target = e.target as HTMLTextAreaElement;
  emit("update:modelValue", target.value);
}

function onMenuEdit(value: string) {
  emit("update:modelValue", value);
}
</script>

<template>
  <TextFieldContextMenu :target="() => textareaEl" @edit="onMenuEdit">
    <textarea
      ref="textareaEl"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :rows="rows || 3"
      :class="
        cn(
          'flex min-h-15 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          props.class,
        )
      "
      @input="onInput"
    />
  </TextFieldContextMenu>
</template>
