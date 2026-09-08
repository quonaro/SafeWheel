<script setup lang="ts">
import {
  ContextMenuContent,
  ContextMenuPortal,
  type ContextMenuContentEmits,
  type ContextMenuContentProps,
  useForwardPropsEmits,
} from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<ContextMenuContentProps & { class?: string }>();
const emits = defineEmits<ContextMenuContentEmits>();
const forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
  <ContextMenuPortal>
    <ContextMenuContent
      v-bind="forwarded"
      :class="
        cn(
          'z-50 min-w-32 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          props.class,
        )
      "
    >
      <slot />
    </ContextMenuContent>
  </ContextMenuPortal>
</template>
