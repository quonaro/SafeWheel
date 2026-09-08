<script setup lang="ts">
import { ContextMenuSeparator, type ContextMenuSeparatorProps } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<ContextMenuSeparatorProps & { class?: string }>();
</script>

<template>
  <ContextMenuSeparator
    v-bind="props"
    :class="cn('-mx-1 my-1 h-px bg-border', props.class)"
  />
</template>
