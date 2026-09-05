<script lang="ts" setup>
import { ref, watch, onMounted } from "vue";
import { IconPlus, IconTrash, IconPencil, IconUsers } from "@tabler/icons-vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useTeams, useParticipants } from "@/composables/useApi";
const props = defineProps<{ competitionId: number }>();

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

const expandedTeam = ref<number | null>(null);
const showTeamDialog = ref(false);
const showParticipantDialog = ref(false);
const editingTeam = ref<any>(null);
const editingParticipant = ref<any>(null);
const teamName = ref("");
const participantName = ref("");
const participantGender = ref("");
const participantBirthDate = ref("");
const participantAge = ref(0);

onMounted(() => loadTeams(props.competitionId));
watch(
  () => props.competitionId,
  () => loadTeams(props.competitionId),
);

async function toggleTeam(teamId: number) {
  if (expandedTeam.value === teamId) {
    expandedTeam.value = null;
  } else {
    expandedTeam.value = teamId;
    await loadParticipants(teamId);
  }
}

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
  if (editingTeam.value) {
    await updateTeam(editingTeam.value.id, teamName.value);
  } else {
    await createTeam(props.competitionId, teamName.value);
  }
  showTeamDialog.value = false;
  await loadTeams(props.competitionId);
}

async function removeTeam(team: any) {
  await deleteTeam(team.id);
  await loadTeams(props.competitionId);
}

function openCreateParticipant(teamId: number) {
  editingParticipant.value = null;
  participantName.value = "";
  participantGender.value = "";
  participantBirthDate.value = "";
  participantAge.value = 0;
  showParticipantDialog.value = true;
}

function openEditParticipant(p: any) {
  editingParticipant.value = p;
  participantName.value = p.full_name;
  participantGender.value = p.gender || "";
  participantBirthDate.value = p.birth_date || "";
  participantAge.value = p.age;
  showParticipantDialog.value = true;
}

async function saveParticipant() {
  if (!participantName.value.trim()) return;
  const teamId = expandedTeam.value!;
  const data = {
    full_name: participantName.value,
    gender: participantGender.value,
    birth_date: participantBirthDate.value || null,
    age: participantAge.value,
  };
  if (editingParticipant.value) {
    await updateParticipant(editingParticipant.value.id, data);
  } else {
    await createParticipant(teamId, data);
  }
  showParticipantDialog.value = false;
  await loadParticipants(teamId);
}

async function removeParticipant(p: any) {
  await deleteParticipant(p.id);
  if (expandedTeam.value) await loadParticipants(expandedTeam.value);
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">Команды и участники</h2>
      <Button size="sm" @click="openCreateTeam">
        <IconPlus class="mr-2 h-4 w-4" />
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

    <Card v-for="team in teams" :key="team.id" class="overflow-hidden">
      <CardHeader
        class="flex flex-row items-center justify-between cursor-pointer py-3"
        @click="toggleTeam(team.id)"
      >
        <div class="flex items-center gap-3">
          <CardTitle class="text-base">{{ team.name }}</CardTitle>
          <Badge variant="secondary">{{ participants.length }}/4</Badge>
        </div>
        <div class="flex gap-1" @click.stop>
          <Button variant="ghost" size="icon" @click="openEditTeam(team)">
            <IconPencil class="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" @click="removeTeam(team)">
            <IconTrash class="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent v-if="expandedTeam === team.id" class="pt-0">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm font-medium">Участники</span>
          <Button
            size="sm"
            variant="outline"
            @click="openCreateParticipant(team.id)"
          >
            <IconPlus class="mr-1 h-3 w-3" />
            Добавить
          </Button>
        </div>
        <div
          v-if="participants.length === 0"
          class="text-sm text-muted-foreground py-2"
        >
          Нет участников
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="p in participants"
            :key="p.id"
            class="flex items-center justify-between rounded-md border p-2"
          >
            <div class="flex items-center gap-3">
              <div>
                <span class="text-sm font-medium">{{ p.full_name }}</span>
                <span
                  v-if="p.gender"
                  class="text-xs text-muted-foreground ml-2"
                  >{{ p.gender }}</span
                >
              </div>
              <Badge v-if="p.age" variant="outline">{{ p.age }} лет</Badge>
            </div>
            <div class="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                @click="openEditParticipant(p)"
              >
                <IconPencil class="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" @click="removeParticipant(p)">
                <IconTrash class="h-3 w-3" />
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
          <Button variant="outline" @click="showTeamDialog = false"
            >Отмена</Button
          >
          <Button @click="saveTeam">Сохранить</Button>
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
              <Label>Пол</Label>
              <Input v-model="participantGender" placeholder="М/Ж" />
            </div>
            <div class="space-y-2">
              <Label>Возраст</Label>
              <Input v-model="participantAge" type="number" placeholder="0" />
            </div>
          </div>
          <div class="space-y-2">
            <Label>Дата рождения</Label>
            <Input v-model="participantBirthDate" type="date" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showParticipantDialog = false"
            >Отмена</Button
          >
          <Button @click="saveParticipant">Сохранить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
