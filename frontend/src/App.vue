<script lang="ts" setup>
import { ref, onMounted, watch, computed, onBeforeUnmount } from "vue";
import {
  IconTrophy,
  IconUsers,
  IconFlag,
  IconClipboardList,
  IconChartBar,
  IconReportAnalytics,
  IconPlus,
  IconPencil,
  IconTrash,
  IconSun,
  IconMoon,
  IconSettings,
  IconX,
  IconDeviceFloppy,
  IconDownload,
  IconUpload,
  IconFileZip,
  IconLoader2,
} from "@tabler/icons-vue";
import { EventsOn } from "../wailsjs/runtime/runtime";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Toaster } from "vue-sonner";
import { toast } from "@/composables/useToast";
import { useCompetitions } from "@/composables/useApi";
import { useExchange } from "@/composables/useApi";
import { useExport } from "@/composables/useApi";
import { useTheme } from "@/composables/useTheme";
import { useSettings } from "@/composables/useSettings";
import { useAppState } from "@/composables/useAppState";
import TeamsParticipants from "@/components/competition/TeamsParticipants.vue";
import StagesManager from "@/components/competition/StagesManager.vue";
import ResultsInput from "@/components/competition/ResultsInput.vue";
import StandingsTable from "@/components/competition/StandingsTable.vue";
import Statistics from "@/components/competition/Statistics.vue";

const { load, create, update, remove, competitions } = useCompetitions();
const { theme, toggleTheme } = useTheme();
const { fontSize, FONT_SIZES } = useSettings();
const { state } = useAppState();
const { exportJSON, pickImportFile, importCompetitions } = useExchange();
const { exportReportArchive } = useExport();

const appVersion = __APP_VERSION__;

const selectedCompetition = ref<any>(null);
const activeTab = ref<
  "teams" | "stages" | "results" | "standings" | "statistics"
>("teams");

const maxParticipants = computed(() => {
  if (!selectedCompetition.value) return 4;
  try {
    const settings = JSON.parse(selectedCompetition.value.settings || "{}");
    return settings.maxParticipantsPerTeam || 4;
  } catch {
    return 4;
  }
});
const showCreateDialog = ref(false);
const showDeleteDialog = ref(false);
const showEditDialog = ref(false);
const newCompName = ref("");
const newCompDesc = ref("");
const editCompName = ref("");
const editCompDesc = ref("");
const editMaxParticipants = ref<number | null>(4);

const showExportDialog = ref(false);
const showImportDialog = ref(false);
const showSettingsDialog = ref(false);
const exportSelected = ref<Record<number, boolean>>({});
const importFileComps = ref<any[]>([]);
const importSelected = ref<Record<number, boolean>>({});

const fontOptions = computed(() =>
  FONT_SIZES.map((size) => ({
    value: size,
    label:
      size === 14
        ? "Мелкий"
        : size === 16
          ? "Обычный"
          : size === 18
            ? "Крупный"
            : "Очень крупный",
  })),
);

const tabs = [
  { key: "teams", label: "Команды", icon: IconUsers },
  { key: "stages", label: "Этапы", icon: IconFlag },
  { key: "results", label: "Результаты", icon: IconClipboardList },
  { key: "standings", label: "Турнирная таблица", icon: IconChartBar },
  { key: "statistics", label: "Статистика", icon: IconReportAnalytics },
] as const;

onMounted(async () => {
  await load();

  unlistenReportProgress = EventsOn("report-progress", onReportProgress);

  const lastId = state.selectedCompetitionId;
  if (lastId != null) {
    const found = competitions.value.find((c) => c.id === lastId);
    if (found) {
      const savedTab = state.activeTab;
      activeTab.value =
        savedTab && tabs.some((t) => t.key === savedTab) ? savedTab : "teams";
      selectedCompetition.value = found;
      return;
    }
  }

  if (competitions.value.length > 0) {
    selectCompetition(competitions.value[0]);
  }
});

function selectCompetition(comp: any) {
  selectedCompetition.value = comp;
  activeTab.value = "teams";
}

watch([() => selectedCompetition.value?.id, activeTab], ([id, tab]) => {
  if (id != null) state.selectedCompetitionId = id;
  state.activeTab = tab;
});

onBeforeUnmount(() => {
  unlistenReportProgress?.();
});

async function handleCreate() {
  if (!newCompName.value.trim()) return;
  const result = await create({
    name: newCompName.value,
    description: newCompDesc.value,
  });
  if (result) {
    showCreateDialog.value = false;
    newCompName.value = "";
    newCompDesc.value = "";
    await load();
    selectCompetition(result);
    toast.success("Соревнование создано");
  }
}

async function handleDelete() {
  if (!selectedCompetition.value) return;
  const result = await remove(selectedCompetition.value.id);
  if (result === null) return;
  showDeleteDialog.value = false;
  selectedCompetition.value = null;
  await load();
  toast.success("Соревнование удалено");
}

function openEditDialog() {
  if (!selectedCompetition.value) return;
  editCompName.value = selectedCompetition.value.name;
  editCompDesc.value = selectedCompetition.value.description || "";
  try {
    const settings = JSON.parse(selectedCompetition.value.settings);
    if (settings.maxParticipantsPerTeam) {
      editMaxParticipants.value = settings.maxParticipantsPerTeam;
    } else {
      editMaxParticipants.value = 4;
    }
  } catch {
    editMaxParticipants.value = 4;
  }
  showEditDialog.value = true;
}

async function handleEdit() {
  if (!selectedCompetition.value) return;
  if (!editCompName.value.trim()) return;
  const settings = JSON.stringify({
    maxParticipantsPerTeam: editMaxParticipants.value ?? 4,
  });
  const result = await update(selectedCompetition.value.id, {
    name: editCompName.value,
    description: editCompDesc.value,
    settings,
  });
  if (result) {
    showEditDialog.value = false;
    await load();
    selectCompetition(result);
    toast.success("Изменения сохранены");
  }
}

const reportLoading = ref(false);
const showReportProgress = ref(false);
const reportProgressMessage = ref("Начинаем формирование...");
const reportProgressCurrent = ref(0);
const reportProgressTotal = ref(0);

const reportProgressPercent = computed(() => {
  if (!reportProgressTotal.value) return 0;
  return Math.min(
    100,
    Math.round((reportProgressCurrent.value / reportProgressTotal.value) * 100),
  );
});

const onReportProgress = (payload: any) => {
  if (!payload) return;
  reportProgressMessage.value = payload.message || reportProgressMessage.value;
  reportProgressCurrent.value = Number(payload.current) || 0;
  reportProgressTotal.value = Number(payload.total) || 0;
};

let unlistenReportProgress: (() => void) | null = null;

async function handleExportReport() {
  if (!selectedCompetition.value || reportLoading.value) return;
  reportLoading.value = true;
  reportProgressMessage.value = "Начинаем формирование...";
  reportProgressCurrent.value = 0;
  reportProgressTotal.value = 0;
  showReportProgress.value = true;
  try {
    const result = await exportReportArchive(selectedCompetition.value.id);
    if (result === true) {
      toast.success("Отчет сформирован", {
        description: "Архив со всеми отчетами и статистикой сохранен",
      });
    }
  } finally {
    reportLoading.value = false;
    showReportProgress.value = false;
  }
}

function openExportDialog() {
  exportSelected.value = Object.fromEntries(
    competitions.value.map((c) => [c.id, true]),
  );
  showExportDialog.value = true;
}

const exportAllSelected = computed({
  get: () =>
    competitions.value.length > 0 &&
    competitions.value.every((c) => exportSelected.value[c.id]),
  set: (val: boolean) => {
    for (const c of competitions.value) exportSelected.value[c.id] = val;
  },
});

async function handleExport() {
  const ids = competitions.value
    .filter((c) => exportSelected.value[c.id])
    .map((c) => c.id);
  if (ids.length === 0) return;
  const result = await exportJSON(ids);
  if (result !== null) {
    showExportDialog.value = false;
    toast.success("Экспортировано", {
      description: `Сохранено соревнований: ${ids.length}`,
    });
  }
}

async function openImportDialog() {
  importFileComps.value = [];
  importSelected.value = {};
  showImportDialog.value = true;
}

async function handlePickImportFile() {
  const result = await pickImportFile();
  if (!Array.isArray(result)) return;
  importFileComps.value = result;
  importSelected.value = Object.fromEntries(result.map((_, i) => [i, true]));
}

const importAllSelected = computed({
  get: () =>
    importFileComps.value.length > 0 &&
    importFileComps.value.every((_, i) => importSelected.value[i]),
  set: (val: boolean) => {
    for (let i = 0; i < importFileComps.value.length; i++) {
      importSelected.value[i] = val;
    }
  },
});

async function handleImport() {
  const comps = importFileComps.value.filter((_, i) => importSelected.value[i]);
  if (comps.length === 0) return;
  const result = await importCompetitions(comps);
  if (result !== null) {
    showImportDialog.value = false;
    importFileComps.value = [];
    importSelected.value = {};
    await load();
    toast.success("Импортировано", {
      description: `Добавлено соревнований: ${comps.length}`,
    });
  }
}
</script>

<template>
  <div
    class="flex h-screen w-full overflow-hidden bg-background text-foreground"
  >
    <!-- Sidebar -->
    <aside class="flex w-64 flex-col border-r bg-card">
      <div
        class="flex h-16 shrink-0 items-center justify-between gap-3 px-4 border-b"
      >
        <div class="flex min-w-0 items-center gap-3">
          <img
            src="/logo-48x48.png"
            alt="SafeWheel"
            class="h-12 w-12 shrink-0"
          />
          <div class="flex flex-col leading-tight">
            <span class="text-base font-bold">Безопасное</span>
            <span class="text-base font-bold">колесо</span>
          </div>
        </div>
        <button
          @click="toggleTheme"
          title="Сменить тему"
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-accent"
        >
          <component
            :is="theme === 'dark' ? IconSun : IconMoon"
            class="h-4 w-4"
          />
        </button>
      </div>

      <div class="px-2 py-3 space-y-2">
        <Button class="w-full" @click="showCreateDialog = true">
          <IconPlus class="h-4 w-4" />
          Создать соревнование
        </Button>
        <div class="flex gap-2">
          <Button
            variant="outline"
            class="flex-1"
            :disabled="competitions.length === 0"
            @click="openExportDialog"
          >
            <IconDownload class="h-4 w-4" />
            Экспорт
          </Button>
          <Button variant="outline" class="flex-1" @click="openImportDialog">
            <IconUpload class="h-4 w-4" />
            Импорт
          </Button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-2 space-y-1">
        <button
          v-for="comp in competitions"
          :key="comp.id"
          @click="selectCompetition(comp)"
          :class="[
            'flex w-full items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium text-left transition-colors',
            selectedCompetition?.id === comp.id
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          ]"
        >
          <span class="flex-1 truncate">{{ comp.name }}</span>
        </button>
        <p
          v-if="competitions.length === 0"
          class="px-3 py-4 text-sm text-muted-foreground text-center"
        >
          Нет соревнований
        </p>
      </div>

      <div class="shrink-0 border-t p-2 space-y-1">
        <button
          @click="showSettingsDialog = true"
          class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
        >
          <IconSettings class="h-4 w-4" />
          Настройки
        </button>
        <hr class="mt-2 border-t -mx-2" />
        <p class="mt-2 text-center text-xs text-muted-foreground">
          v{{ appVersion }}
        </p>
      </div>
    </aside>

    <!-- Main Content -->
    <main
      v-if="selectedCompetition"
      class="flex flex-1 flex-col overflow-hidden"
    >
      <!-- Header -->
      <header
        class="flex h-16 shrink-0 items-center justify-between border-b bg-card px-6"
      >
        <div class="flex min-w-0 items-center gap-3">
          <div class="min-w-0">
            <h1 class="truncate text-xl font-bold">
              {{ selectedCompetition.name }}
            </h1>
            <p
              v-if="selectedCompetition.description"
              class="truncate text-sm text-muted-foreground"
            >
              {{ selectedCompetition.description }}
            </p>
          </div>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            :disabled="reportLoading"
            @click="handleExportReport"
            title="Сформировать архив всех отчетов и статистики"
          >
            <IconFileZip class="h-4 w-4" />
            Отчет
          </Button>
          <Button size="sm" @click="openEditDialog">
            <IconPencil class="h-4 w-4" />
            Изменить
          </Button>
          <Button
            variant="destructive"
            size="sm"
            @click="showDeleteDialog = true"
          >
            <IconTrash class="h-4 w-4" />
            Удалить
          </Button>
        </div>
      </header>

      <!-- Tabs -->
      <nav class="flex border-b bg-card px-6 gap-1">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeTab = tab.key"
          :class="[
            'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2',
            activeTab === tab.key
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          ]"
        >
          <component :is="tab.icon" class="h-4 w-4" />
          {{ tab.label }}
        </button>
      </nav>

      <!-- Tab Content -->
      <div class="flex-1 overflow-y-auto p-6">
        <TeamsParticipants
          v-if="activeTab === 'teams'"
          :competition-id="selectedCompetition.id"
          :max-participants="maxParticipants"
        />
        <StagesManager
          v-else-if="activeTab === 'stages'"
          :competition-id="selectedCompetition.id"
        />
        <ResultsInput
          v-else-if="activeTab === 'results'"
          :competition-id="selectedCompetition.id"
        />
        <StandingsTable
          v-else-if="activeTab === 'standings'"
          :competition-id="selectedCompetition.id"
        />
        <Statistics
          v-else-if="activeTab === 'statistics'"
          :competition-id="selectedCompetition.id"
        />
      </div>
    </main>

    <!-- Empty State -->
    <main v-else class="flex flex-1 items-center justify-center">
      <div class="text-center space-y-4">
        <IconTrophy class="mx-auto h-16 w-16 text-muted-foreground" />
        <h2 class="text-xl font-semibold">Выберите соревнование</h2>
        <p class="text-muted-foreground">
          Создайте новое или выберите существующее
        </p>
        <Button @click="showCreateDialog = true">
          <IconPlus class="h-4 w-4" />
          Создать соревнование
        </Button>
      </div>
    </main>

    <!-- Create Dialog -->
    <Dialog v-model:open="showCreateDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новое соревнование</DialogTitle>
          <DialogDescription
            >Создайте новое соревнование для управления</DialogDescription
          >
        </DialogHeader>
        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <Label>Название</Label>
            <Input v-model="newCompName" placeholder="Название соревнования" />
          </div>
          <div class="space-y-2">
            <Label>Описание</Label>
            <Textarea
              v-model="newCompDesc"
              placeholder="Описание (необязательно)"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showCreateDialog = false">
            <IconX class="h-4 w-4" />
            Отмена
          </Button>
          <Button @click="handleCreate">
            <IconPlus class="h-4 w-4" />
            Создать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Edit Dialog -->
    <Dialog v-model:open="showEditDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Изменить соревнование</DialogTitle>
          <DialogDescription>Измените параметры соревнования</DialogDescription>
        </DialogHeader>
        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <Label>Название</Label>
            <Input v-model="editCompName" placeholder="Название соревнования" />
          </div>
          <div class="space-y-2">
            <Label>Описание</Label>
            <Textarea
              v-model="editCompDesc"
              placeholder="Описание (необязательно)"
            />
          </div>
          <div class="space-y-2">
            <Label>Максимум участников в команде</Label>
            <Input
              v-model="editMaxParticipants"
              type="number"
              min="1"
              max="10"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showEditDialog = false">
            <IconX class="h-4 w-4" />
            Отмена
          </Button>
          <Button @click="handleEdit">
            <IconDeviceFloppy class="h-4 w-4" />
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Toaster position="bottom-right" rich-colors :theme="theme" />

    <!-- Delete Dialog -->
    <Dialog v-model:open="showDeleteDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Удалить соревнование?</DialogTitle>
          <DialogDescription>
            Это действие нельзя отменить. Все данные будут удалены.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="showDeleteDialog = false">
            <IconX class="h-4 w-4" />
            Отмена
          </Button>
          <Button variant="destructive" @click="handleDelete">
            <IconTrash class="h-4 w-4" />
            Удалить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Report Progress Dialog -->
    <Dialog v-model:open="showReportProgress">
      <DialogContent class="sm:max-w-md" @interact-outside.prevent>
        <DialogHeader>
          <DialogTitle>Формирование отчётов</DialogTitle>
          <DialogDescription>
            Собираем все отчёты и статистику в архив
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-3 py-2">
          <div class="flex items-center gap-3">
            <IconLoader2 class="h-5 w-5 shrink-0 animate-spin text-primary" />
            <span class="min-w-0 flex-1 truncate text-sm">
              {{ reportProgressMessage }}
            </span>
          </div>
          <div class="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              class="h-full rounded-full bg-primary transition-all duration-200"
              :style="{ width: reportProgressPercent + '%' }"
            />
          </div>
          <p class="text-right text-xs text-muted-foreground">
            {{ reportProgressCurrent }} / {{ reportProgressTotal }}
          </p>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Export Dialog -->
    <Dialog v-model:open="showExportDialog">
      <DialogContent class="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Экспорт в JSON</DialogTitle>
          <DialogDescription>
            Выберите соревнования для выгрузки в файл
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-3 py-2">
          <div class="flex items-center gap-2 text-sm font-medium">
            <Checkbox v-model="exportAllSelected" />
            Выбрать все / Снять все
          </div>
          <hr />
          <div
            v-if="competitions.length === 0"
            class="py-4 text-center text-sm text-muted-foreground"
          >
            Нет соревнований для экспорта
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="comp in competitions"
              :key="comp.id"
              class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
            >
              <Checkbox v-model="exportSelected[comp.id]" />
              <span class="flex-1 truncate">{{ comp.name }}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showExportDialog = false">
            <IconX class="h-4 w-4" />
            Отмена
          </Button>
          <Button @click="handleExport">
            <IconDownload class="h-4 w-4" />
            Экспортировать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Import Dialog -->
    <Dialog v-model:open="showImportDialog">
      <DialogContent class="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Импорт из JSON</DialogTitle>
          <DialogDescription>
            Выберите файл и соревнования для загрузки. Дубликаты получат
            порядковый номер в имени.
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-3 py-2">
          <Button
            variant="outline"
            class="w-full"
            @click="handlePickImportFile"
          >
            <IconUpload class="h-4 w-4" />
            Выбрать файл
          </Button>
          <template v-if="importFileComps.length > 0">
            <div class="flex items-center gap-2 text-sm font-medium">
              <Checkbox v-model="importAllSelected" />
              Выбрать все / Снять все
            </div>
            <hr />
            <div class="space-y-2">
              <div
                v-for="(comp, i) in importFileComps"
                :key="i"
                class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
              >
                <Checkbox v-model="importSelected[i]" />
                <span class="flex-1 truncate">{{ comp.name }}</span>
                <span class="shrink-0 text-xs text-muted-foreground">
                  {{ comp.teams?.length ?? 0 }} команд ·
                  {{ comp.stages?.length ?? 0 }} этапов
                </span>
              </div>
            </div>
          </template>
          <p v-else class="py-4 text-center text-sm text-muted-foreground">
            Файл не выбран
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showImportDialog = false">
            <IconX class="h-4 w-4" />
            Отмена
          </Button>
          <Button
            :disabled="importFileComps.length === 0"
            @click="handleImport"
          >
            <IconPlus class="h-4 w-4" />
            Импортировать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Settings Dialog -->
    <Dialog v-model:open="showSettingsDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Настройки</DialogTitle>
          <DialogDescription
            >Настройте отображение приложения</DialogDescription
          >
        </DialogHeader>
        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <Label>Тема</Label>
            <RadioGroup v-model="theme" class="grid-cols-2 gap-2">
              <label
                :class="[
                  'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
                  theme === 'light'
                    ? 'border-primary text-foreground'
                    : 'border-border hover:bg-accent',
                ]"
              >
                <RadioGroupItem value="light" id="theme-light" />
                <IconSun class="h-4 w-4" />
                <span class="flex-1">Светлая</span>
              </label>
              <label
                :class="[
                  'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
                  theme === 'dark'
                    ? 'border-primary text-foreground'
                    : 'border-border hover:bg-accent',
                ]"
              >
                <RadioGroupItem value="dark" id="theme-dark" />
                <IconMoon class="h-4 w-4" />
                <span class="flex-1">Тёмная</span>
              </label>
            </RadioGroup>
          </div>
          <div class="space-y-2">
            <Label>Размер шрифта</Label>
            <RadioGroup v-model="fontSize" class="grid-cols-2 gap-2">
              <label
                v-for="opt in fontOptions"
                :key="opt.value"
                :class="[
                  'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
                  fontSize === opt.value
                    ? 'border-primary text-foreground'
                    : 'border-border hover:bg-accent',
                ]"
              >
                <RadioGroupItem
                  :value="opt.value"
                  :id="`font-size-${opt.value}`"
                />
                <span class="flex-1">{{ opt.label }}</span>
                <span class="text-xs text-muted-foreground">
                  {{ opt.value }}px
                </span>
              </label>
            </RadioGroup>
            <p class="text-xs text-muted-foreground">
              Изменение применяется сразу и сохраняется между запусками
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showSettingsDialog = false">
            <IconX class="h-4 w-4" />
            Закрыть
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
