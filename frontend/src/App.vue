<script lang="ts" setup>
import { ref, onMounted, watch, computed } from "vue";
import {
  IconTrophy,
  IconUsers,
  IconFlag,
  IconClipboardList,
  IconChartBar,
  IconPlus,
  IconPencil,
  IconTrash,
  IconSun,
  IconMoon,
  IconX,
  IconDeviceFloppy,
} from "@tabler/icons-vue";
import { Button } from "@/components/ui/button";
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
import { Toaster } from "vue-sonner";
import { toast } from "@/composables/useToast";
import { useCompetitions } from "@/composables/useApi";
import { useTheme } from "@/composables/useTheme";
import { useAppState } from "@/composables/useAppState";
import TeamsParticipants from "@/components/competition/TeamsParticipants.vue";
import StagesManager from "@/components/competition/StagesManager.vue";
import ResultsInput from "@/components/competition/ResultsInput.vue";
import StandingsTable from "@/components/competition/StandingsTable.vue";

const { load, create, update, remove, competitions } = useCompetitions();
const { theme, toggleTheme } = useTheme();
const { state } = useAppState();

const selectedCompetition = ref<any>(null);
const activeTab = ref<"teams" | "stages" | "results" | "standings">("teams");

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
const editMaxParticipants = ref(4);

const tabs = [
  { key: "teams", label: "Команды", icon: IconUsers },
  { key: "stages", label: "Этапы", icon: IconFlag },
  { key: "results", label: "Результаты", icon: IconClipboardList },
  { key: "standings", label: "Турнирная таблица", icon: IconChartBar },
] as const;

onMounted(async () => {
  await load();

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
    maxParticipantsPerTeam: editMaxParticipants.value,
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
</script>

<template>
  <div
    class="flex h-screen w-full overflow-hidden bg-background text-foreground"
  >
    <!-- Sidebar -->
    <aside class="flex w-64 flex-col border-r bg-card">
      <div class="flex h-16 shrink-0 items-center gap-3 px-4 border-b">
        <img src="/logo-48x48.png" alt="SafeWheel" class="h-12 w-12 shrink-0" />
        <div class="flex flex-col leading-tight">
          <span class="text-base font-bold">Безопасное</span>
          <span class="text-base font-bold">колесо</span>
        </div>
      </div>

      <div class="px-2 py-3">
        <Button class="w-full" @click="showCreateDialog = true">
          <IconPlus class="h-4 w-4" />
          Создать соревнование
        </Button>
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

      <div class="shrink-0 border-t p-2">
        <button
          @click="toggleTheme"
          class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
        >
          <component
            :is="theme === 'dark' ? IconSun : IconMoon"
            class="h-4 w-4"
          />
          {{ theme === "dark" ? "Светлая тема" : "Тёмная тема" }}
        </button>
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
  </div>
</template>
