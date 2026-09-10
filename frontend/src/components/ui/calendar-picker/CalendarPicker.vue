<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
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
    modelValue?: string | null;
    placeholder?: string;
    disabled?: boolean;
    class?: string;
    /** Максимально допустимая дата ("YYYY-MM-DD"). По умолчанию — сегодня. */
    maxDate?: string | null;
    /** Минимально допустимая дата ("YYYY-MM-DD"). По умолчанию — без ограничений. */
    minDate?: string | null;
  }>(),
  {
    modelValue: null,
    placeholder: "Выберите дату",
    disabled: false,
    maxDate: null,
    minDate: null,
  },
);

const emit = defineEmits<{ "update:modelValue": [value: string | null] }>();

const MONTHS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];
const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const open = ref(false);
const viewYear = ref(new Date().getFullYear());
const viewMonth = ref(new Date().getMonth());

const selected = computed(() => parseDate(props.modelValue));
const maxDate = computed(() => parseDate(props.maxDate) ?? startOfToday());
const minDate = computed(() => parseDate(props.minDate));

const displayText = computed(() =>
  selected.value
    ? `${String(selected.value.getDate()).padStart(2, "0")}.${String(selected.value.getMonth() + 1).padStart(2, "0")}.${selected.value.getFullYear()}`
    : "",
);

watch(open, (isOpen) => {
  if (!isOpen) return;
  const base = selected.value ?? startOfToday();
  viewYear.value = base.getFullYear();
  viewMonth.value = base.getMonth();
});

const grid = computed(() => {
  const first = new Date(viewYear.value, viewMonth.value, 1);
  const offset = (first.getDay() + 6) % 7; // неделя начинается с понедельника
  const daysInMonth = new Date(
    viewYear.value,
    viewMonth.value + 1,
    0,
  ).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < 42; i++) {
    const day = i - offset + 1;
    cells.push(
      day < 1 || day > daysInMonth
        ? null
        : new Date(viewYear.value, viewMonth.value, day),
    );
  }
  return cells;
});

function isDisabled(d: Date): boolean {
  if (minDate.value && d < minDate.value) return true;
  if (maxDate.value && d > maxDate.value) return true;
  return false;
}

function isSelected(d: Date): boolean {
  return !!selected.value && sameDay(d, selected.value);
}

function isToday(d: Date): boolean {
  return sameDay(d, startOfToday());
}

function canPrevMonth(): boolean {
  if (!minDate.value) return true;
  const prev = new Date(viewYear.value, viewMonth.value - 1, 1);
  return (
    prev >= new Date(minDate.value.getFullYear(), minDate.value.getMonth(), 1)
  );
}

function canNextMonth(): boolean {
  const next = new Date(viewYear.value, viewMonth.value + 1, 1);
  return (
    next <= new Date(maxDate.value.getFullYear(), maxDate.value.getMonth(), 1)
  );
}

function prevMonth() {
  viewMonth.value -= 1;
  if (viewMonth.value < 0) {
    viewMonth.value = 11;
    viewYear.value -= 1;
  }
}

function nextMonth() {
  viewMonth.value += 1;
  if (viewMonth.value > 11) {
    viewMonth.value = 0;
    viewYear.value += 1;
  }
}

function prevYear() {
  viewYear.value -= 1;
}

function nextYear() {
  viewYear.value += 1;
}

function pick(d: Date) {
  emit("update:modelValue", formatDate(d));
  open.value = false;
}

function clear() {
  emit("update:modelValue", null);
  open.value = false;
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
            'flex h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
            props.class,
          )
        "
      >
        <IconCalendar class="h-4 w-4 shrink-0 text-muted-foreground" />
        <span
          :class="
            cn(
              'truncate',
              displayText ? 'text-foreground' : 'text-muted-foreground',
            )
          "
        >
          {{ displayText || placeholder }}
        </span>
      </button>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0" align="start" :side-offset="4">
      <div class="p-3">
        <div class="mb-3 flex items-center justify-between">
          <div class="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              class="h-7 w-7"
              title="Предыдущий год"
              :disabled="viewYear - 1 < (minDate?.getFullYear() ?? -Infinity)"
              @click="prevYear"
            >
              <IconChevronsLeft class="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              class="h-7 w-7"
              title="Предыдущий месяц"
              :disabled="!canPrevMonth()"
              @click="prevMonth"
            >
              <IconChevronLeft class="h-4 w-4" />
            </Button>
          </div>
          <div class="text-sm font-medium">
            {{ MONTHS[viewMonth] }} {{ viewYear }}
          </div>
          <div class="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              class="h-7 w-7"
              title="Следующий месяц"
              :disabled="!canNextMonth()"
              @click="nextMonth"
            >
              <IconChevronRight class="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              class="h-7 w-7"
              title="Следующий год"
              :disabled="viewYear + 1 > maxDate.getFullYear()"
              @click="nextYear"
            >
              <IconChevronsRight class="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div class="mb-1 grid grid-cols-7 gap-1">
          <div
            v-for="w in WEEKDAYS"
            :key="w"
            class="flex h-8 w-8 items-center justify-center text-xs font-medium text-muted-foreground"
          >
            {{ w }}
          </div>
        </div>

        <div class="grid grid-cols-7 gap-1">
          <template v-for="(d, i) in grid" :key="i">
            <button
              v-if="d"
              type="button"
              :disabled="isDisabled(d)"
              :class="
                cn(
                  'flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors',
                  isSelected(d)
                    ? 'bg-primary font-medium text-primary-foreground'
                    : isToday(d)
                      ? 'bg-accent font-medium text-accent-foreground'
                      : 'hover:bg-accent',
                  isDisabled(d) && 'pointer-events-none opacity-40',
                )
              "
              @click="pick(d)"
            >
              {{ d.getDate() }}
            </button>
            <div v-else class="h-8 w-8" />
          </template>
        </div>

        <div class="mt-2 flex justify-end border-t pt-2">
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
