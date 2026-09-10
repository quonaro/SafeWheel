<script lang="ts" setup>
import { ref, computed, watch, onMounted } from "vue";
import {
  IconPlus,
  IconTrash,
  IconPencil,
  IconUsers,
  IconX,
  IconDeviceFloppy,
  IconChevronDown,
} from "@tabler/icons-vue";
import { toast } from "@/composables/useToast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarPicker } from "@/components/ui/calendar-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useTeams, useParticipants } from "@/composables/useApi";
import { useAppState } from "@/composables/useAppState";
const props = withDefaults(
  defineProps<{ competitionId: number; maxParticipants?: number }>(),
  {
    maxParticipants: 4,
  },
);

const {
  teams,
  load: loadTeams,
  create: createTeam,
  update: updateTeam,
  remove: deleteTeam,
} = useTeams();
const {
  participants,
  load: loadParticipants,
  create: createParticipant,
  update: updateParticipant,
  remove: deleteParticipant,
} = useParticipants();
const { state } = useAppState();

const expandedTeam = ref<number | null>(null);
const showTeamDialog = ref(false);
const showParticipantDialog = ref(false);
const showDeleteDialog = ref(false);
const deleteTarget = ref<{ type: "team" | "participant"; item: any } | null>(
  null,
);
const editingTeam = ref<any>(null);
const editingParticipant = ref<any>(null);
const teamName = ref("");
const participantName = ref("");
const participantGender = ref("");
const participantBirthDate = ref<string | null>("");

// Возраст вычисляется из даты рождения и не редактируется вручную.
function calcAge(birthDate: string | null): number {
  if (!birthDate) return 0;
  const t = new Date(`${birthDate.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(t.getTime())) return 0;
  const now = new Date();
  let age = now.getFullYear() - t.getFullYear();
  if (
    now.getMonth() < t.getMonth() ||
    (now.getMonth() === t.getMonth() && now.getDate() < t.getDate())
  ) {
    age--;
  }
  return age < 0 ? 0 : age;
}
const participantAge = computed(() => calcAge(participantBirthDate.value));

async function initialize() {
  await loadTeams(props.competitionId);

  const saved = state.teams?.[props.competitionId]?.expandedTeam;
  if (saved != null && teams.value.some((t) => t.id === saved)) {
    expandedTeam.value = saved;
    await loadParticipants(saved);
  } else {
    expandedTeam.value = null;
  }
}

onMounted(initialize);
watch(() => props.competitionId, initialize);

async function toggleTeam(teamId: number) {
  if (expandedTeam.value === teamId) {
    expandedTeam.value = null;
  } else {
    expandedTeam.value = teamId;
    await loadParticipants(teamId);
  }
}

watch(expandedTeam, (teamId) => {
  if (!state.teams) state.teams = {};
  const current = state.teams[props.competitionId] ?? {};
  state.teams[props.competitionId] = { ...current, expandedTeam: teamId };
});

function openCreateTeam() {
  editingTeam.value = null;
  teamName.value = "";
  showTeamDialog.value = true;
}

function openEditTeam(team: any) {
  editingTeam.value = team;
  teamName.value = team.name;
  showTeamDialog.value = true;
}

async function saveTeam() {
  if (!teamName.value.trim()) return;
  const isEdit = !!editingTeam.value;
  const result = isEdit
    ? await updateTeam(editingTeam.value.id, teamName.value)
    : await createTeam(props.competitionId, teamName.value);
  if (result === null) return;
  showTeamDialog.value = false;
  await loadTeams(props.competitionId);
  toast.success(isEdit ? "Команда обновлена" : "Команда создана", {
    description: teamName.value,
  });
}

function confirmRemoveTeam(team: any) {
  deleteTarget.value = { type: "team", item: team };
  showDeleteDialog.value = true;
}

function confirmRemoveParticipant(p: any) {
  deleteTarget.value = { type: "participant", item: p };
  showDeleteDialog.value = true;
}

async function performDelete() {
  const target = deleteTarget.value;
  if (!target) return;
  showDeleteDialog.value = false;
  if (target.type === "team") {
    const result = await deleteTeam(target.item.id);
    if (result === null) return;
    await loadTeams(props.competitionId);
    toast.success("Команда удалена", { description: target.item.name });
  } else {
    const result = await deleteParticipant(target.item.id);
    if (result === null) return;
    if (expandedTeam.value) await loadParticipants(expandedTeam.value);
    await loadTeams(props.competitionId);
    toast.success("Участник удалён", { description: target.item.full_name });
  }
  deleteTarget.value = null;
}

function openCreateParticipant(teamId: number) {
  editingParticipant.value = null;
  participantName.value = "";
  participantGender.value = "";
  participantBirthDate.value = "";
  showParticipantDialog.value = true;
}

function openEditParticipant(p: any) {
  editingParticipant.value = p;
  participantName.value = p.full_name;
  participantGender.value = p.gender || "";
  // Обрезаем возможный "2012-03-15T00:00:00Z" из старых БД — <input type="date">
  // не умеет показывать такой формат.
  participantBirthDate.value = (p.birth_date || "").slice(0, 10);
  showParticipantDialog.value = true;
}

async function saveParticipant() {
  if (!participantName.value.trim()) return;
  if (!participantGender.value) {
    toast.error("Укажите пол участника");
    return;
  }
  const teamId = expandedTeam.value!;
  const birthDate = participantBirthDate.value;
  const data = {
    full_name: participantName.value,
    gender: participantGender.value || null,
    birth_date: birthDate || null,
    // Возраст всегда берётся из даты рождения; без даты сохраняем прежний возраст.
    age: birthDate ? calcAge(birthDate) : (editingParticipant.value?.age ?? 0),
  };
  const isEdit = !!editingParticipant.value;
  const result = isEdit
    ? await updateParticipant(editingParticipant.value.id, data)
    : await createParticipant(teamId, data);
  if (result === null) return;
  showParticipantDialog.value = false;
  await loadParticipants(teamId);
  await loadTeams(props.competitionId);
  toast.success(isEdit ? "Участник обновлён" : "Участник добавлен", {
    description: participantName.value,
  });
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">Команды и участники</h2>
      <Button size="sm" @click="openCreateTeam">
        <IconPlus class="h-4 w-4" />
        Добавить команду
      </Button>
    </div>

    <div
      v-if="teams.length === 0"
      class="text-center py-12 text-muted-foreground"
    >
      <IconUsers class="mx-auto mb-3 h-12 w-12" />
      <p>Нет команд. Создайте первую команду.</p>
    </div>

    <Card
      v-for="team in teams"
      :key="team.id"
      class="overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/50"
    >
      <CardHeader
        class="flex h-15 flex-row items-center justify-between overflow-hidden py-3 cursor-pointer"
        @click="toggleTeam(team.id)"
      >
        <div class="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            class="h-8 w-8 shrink-0 px-0"
            :title="expandedTeam === team.id ? 'Свернуть' : 'Развернуть'"
            :aria-expanded="expandedTeam === team.id"
            @click.stop="toggleTeam(team.id)"
          >
            <IconChevronDown
              class="h-4 w-4 transition-transform duration-200"
              :class="{ 'rotate-180': expandedTeam === team.id }"
            />
          </Button>
          <CardTitle class="text-base truncate">{{ team.name }}</CardTitle>
          <Badge variant="secondary" class="shrink-0"
            >{{ team.participant_count }}/{{ props.maxParticipants }}</Badge
          >
        </div>
        <div class="flex gap-1" @click.stop>
          <Button size="sm" @click="openEditTeam(team)">
            <IconPencil class="h-4 w-4" />
            Изменить
          </Button>
          <Button
            variant="destructive"
            size="sm"
            @click="confirmRemoveTeam(team)"
          >
            <IconTrash class="h-4 w-4" />
            Удалить
          </Button>
        </div>
      </CardHeader>
      <CardContent v-if="expandedTeam === team.id" class="pt-0">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm font-medium">Участники</span>
          <Button
            v-if="(participants?.length ?? 0) < props.maxParticipants"
            size="sm"
            variant="outline"
            @click="openCreateParticipant(team.id)"
          >
            <IconPlus class="h-3 w-3" />
            Добавить
          </Button>
        </div>
        <div
          v-if="!participants?.length"
          class="py-4 text-center text-sm text-muted-foreground"
        >
          <p>Нет участников</p>
          <Button
            v-if="(participants?.length ?? 0) < props.maxParticipants"
            size="sm"
            variant="outline"
            class="mt-2"
            @click="openCreateParticipant(team.id)"
          >
            <IconPlus class="h-3 w-3" />
            Добавить участника
          </Button>
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="p in participants"
            :key="p.id"
            class="flex items-center justify-between rounded-md border bg-muted p-2"
          >
            <div class="flex items-center gap-3">
              <span class="text-sm font-medium">{{ p.full_name }}</span>
              <Badge v-if="p.gender" variant="outline">{{ p.gender }}</Badge>
              <Badge v-if="p.age" variant="outline">{{ p.age }} лет</Badge>
            </div>
            <div class="flex gap-1">
              <Button size="sm" @click="openEditParticipant(p)">
                <IconPencil class="h-3 w-3" />
                Изменить
              </Button>
              <Button
                variant="destructive"
                size="sm"
                @click="confirmRemoveParticipant(p)"
              >
                <IconTrash class="h-3 w-3" />
                Удалить
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Team Dialog -->
    <Dialog v-model:open="showTeamDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{
            editingTeam ? "Редактировать команду" : "Новая команда"
          }}</DialogTitle>
        </DialogHeader>
        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <Label>Название команды</Label>
            <Input v-model="teamName" placeholder="Название" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showTeamDialog = false">
            <IconX class="h-4 w-4" />
            Отмена
          </Button>
          <Button @click="saveTeam">
            <IconDeviceFloppy class="h-4 w-4" />
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Participant Dialog -->
    <Dialog v-model:open="showParticipantDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{
            editingParticipant ? "Редактировать участника" : "Новый участник"
          }}</DialogTitle>
        </DialogHeader>
        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <Label>ФИО</Label>
            <Input
              v-model="participantName"
              placeholder="Иванов Иван Иванович"
            />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label>Пол <span class="text-destructive">*</span></Label>
              <RadioGroup
                v-model="participantGender"
                class="flex h-9 items-center gap-4"
              >
                <div class="flex items-center space-x-2">
                  <RadioGroupItem id="gender-m" value="М" />
                  <Label for="gender-m" class="font-normal">М</Label>
                </div>
                <div class="flex items-center space-x-2">
                  <RadioGroupItem id="gender-f" value="Ж" />
                  <Label for="gender-f" class="font-normal">Ж</Label>
                </div>
              </RadioGroup>
            </div>
            <div class="space-y-2">
              <Label>Возраст</Label>
              <Input
                :model-value="participantAge"
                type="number"
                disabled
                placeholder="0"
                title="Рассчитывается автоматически из даты рождения"
              />
            </div>
          </div>
          <div class="space-y-2">
            <Label>Дата рождения</Label>
            <CalendarPicker
              v-model="participantBirthDate"
              placeholder="Дата рождения"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showParticipantDialog = false">
            <IconX class="h-4 w-4" />
            Отмена
          </Button>
          <Button @click="saveParticipant">
            <IconDeviceFloppy class="h-4 w-4" />
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Delete Confirmation Dialog -->
    <Dialog v-model:open="showDeleteDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Подтвердите удаление</DialogTitle>
          <DialogDescription>
            Вы уверены, что хотите удалить
            {{ deleteTarget?.type === "team" ? "команду" : "участника" }}
            <strong>{{
              deleteTarget?.type === "team"
                ? deleteTarget?.item?.name
                : deleteTarget?.item?.full_name
            }}</strong
            >? Это действие нельзя отменить.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="showDeleteDialog = false">
            <IconX class="h-4 w-4" />
            Отмена
          </Button>
          <Button variant="destructive" @click="performDelete">
            <IconTrash class="h-4 w-4" />
            Удалить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
