<script setup lang="ts">
import {
  RadioGroupIndicator,
  RadioGroupItem,
  type RadioGroupItemProps,
} from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<RadioGroupItemProps & { class?: string }>();
</script>

<template>
  <RadioGroupItem
    v-bind="props"
    :class="
      cn(
        'aspect-square h-4 w-4 rounded-full border border-primary text-primary shadow focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        props.class,
      )
    "
  >
    <RadioGroupIndicator class="flex items-center justify-center">
      <span class="block h-2 w-2 rounded-full bg-primary" />
    </RadioGroupIndicator>
  </RadioGroupItem>
</template>
