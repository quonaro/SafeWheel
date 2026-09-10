<script lang="ts" setup>
import { ref, watch, onMounted, computed } from "vue";
import {
  IconUsers,
  IconUser,
  IconChartBar,
  IconFileDownload,
  IconTrophy,
  IconClock,
  IconAlertTriangle,
  IconArrowUp,
  IconArrowDown,
  IconCalendar,
} from "@tabler/icons-vue";
import { toast } from "@/composables/useToast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  useTeams,
  useParticipants,
  useStatistics,
  useFormat,
} from "@/composables/useApi";

const props = defineProps<{ competitionId: number }>();

const { teams, load: loadTeams } = useTeams();
const { participants, load: loadParticipants } = useParticipants();
const {
  getParticipantStatistics,
  getTeamStatistics,
  exportParticipantStatistics,
  exportTeamStatistics,
} = useStatistics();
const { formatTimeLocal } = useFormat();

const selectedTeamId = ref<number | null>(null);
const selectedParticipantId = ref<number | null>(null);
const participantStats = ref<any>(null);
const teamStats = ref<any>(null);
const loadingStats = ref(false);

const selectedTeam = computed(() =>
  teams.value.find((t) => t.id === selectedTeamId.value),
);

const selectedParticipant = computed(() =>
  participants.value.find((p) => p.id === selectedParticipantId.value),
);

const medalColors = ["text-yellow-600", "text-gray-400", "text-amber-600"];

onMounted(async () => {
  await loadTeams(props.competitionId);
  if (teams.value.length > 0) {
    selectedTeamId.value = teams.value[0].id;
  }
});

watch(selectedTeamId, async (teamId) => {
  selectedParticipantId.value = null;
  participantStats.value = null;
  teamStats.value = null;
  if (teamId) {
    await loadParticipants(teamId);
    await loadTeamStats(teamId);
  }
});

async function loadTeamStats(teamId: number) {
  loadingStats.value = true;
  const result = await getTeamStatistics(props.competitionId, teamId);
  if (result) teamStats.value = result;
  loadingStats.value = false;
}

watch(selectedParticipantId, async (participantId) => {
  if (!participantId) {
    participantStats.value = null;
    return;
  }
  loadingStats.value = true;
  const result = await getParticipantStatistics(
    props.competitionId,
    participantId,
  );
  if (result) participantStats.value = result;
  loadingStats.value = false;
});

async function handleExportParticipant() {
  if (!selectedParticipantId.value) return;
  await exportParticipantStatistics(
    props.competitionId,
    selectedParticipantId.value,
  );
  toast.success("Экспорт выполнен");
}

async function handleExportTeam() {
  if (!selectedTeamId.value) return;
  await exportTeamStatistics(props.competitionId, selectedTeamId.value);
  toast.success("Экспорт выполнен");
}

function genderLabel(g: string) {
  if (g === "М") return "Юноша";
  if (g === "Ж") return "Девушка";
  return "—";
}
</script>

<template>
  <div class="space-y-4">
    <!-- Team selector -->
    <div class="flex items-center gap-3">
      <IconUsers class="h-5 w-5 text-muted-foreground" />
      <select
        v-model="selectedTeamId"
        class="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <option v-for="t in teams" :key="t.id" :value="t.id">
          {{ t.name }}
        </option>
      </select>
      <Button
        v-if="selectedTeamId"
        size="sm"
        variant="outline"
        @click="handleExportTeam"
      >
        <IconFileDownload class="h-4 w-4" />
        Экспорт команды
      </Button>
    </div>

    <div v-if="!selectedTeamId" class="text-center py-12 text-muted-foreground">
      <IconChartBar class="mx-auto h-12 w-12 mb-3" />
      <p>Выберите команду для просмотра статистики</p>
    </div>

    <template v-if="selectedTeamId">
      <!-- Team Statistics -->
      <div v-if="teamStats" class="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="flex items-center gap-2 text-base">
              <IconUsers class="h-5 w-5" />
              {{ teamStats.team_name }}
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Участников</span>
              <span class="font-medium">{{ teamStats.participant_count }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Средний возраст</span>
              <span class="font-medium">{{
                teamStats.avg_age.toFixed(1)
              }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Сумма штрафных</span>
              <span class="font-medium">{{ teamStats.total_penalties }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Общее время</span>
              <span class="font-medium font-mono">{{
                formatTimeLocal(teamStats.total_time)
              }}</span>
            </div>
            <div
              v-if="teamStats.overall_rank > 0"
              class="flex justify-between text-sm"
            >
              <span class="text-muted-foreground">Место в зачёте</span>
              <span class="font-bold text-primary">
                {{ teamStats.overall_rank }}
              </span>
            </div>
          </CardContent>
        </Card>

        <!-- Team stage results -->
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-base">Результаты по этапам</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Этап</TableHead>
                  <TableHead class="text-center">Штрафы</TableHead>
                  <TableHead class="text-center">Время</TableHead>
                  <TableHead class="text-center">Место</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="sr in teamStats.stage_results"
                  :key="sr.stage_id"
                >
                  <TableCell class="font-medium">{{ sr.stage_name }}</TableCell>
                  <TableCell class="text-center">{{
                    sr.total_penalties
                  }}</TableCell>
                  <TableCell class="text-center font-mono">{{
                    formatTimeLocal(sr.total_time)
                  }}</TableCell>
                  <TableCell class="text-center">
                    <span
                      v-if="sr.stage_rank > 0"
                      :class="[
                        'inline-flex items-center gap-1 font-bold',
                        sr.stage_rank <= 3
                          ? medalColors[sr.stage_rank - 1]
                          : '',
                      ]"
                    >
                      <IconTrophy
                        v-if="sr.stage_rank <= 3"
                        class="h-3.5 w-3.5"
                      />
                      {{ sr.stage_rank }}
                    </span>
                    <span v-else class="text-muted-foreground">—</span>
                  </TableCell>
                </TableRow>
                <TableRow v-if="teamStats.stage_results.length === 0">
                  <TableCell
                    colspan="4"
                    class="text-center text-muted-foreground py-4"
                  >
                    Нет данных
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <!-- Participant selector -->
      <div class="flex items-center gap-3 pt-2">
        <IconUser class="h-5 w-5 text-muted-foreground" />
        <select
          v-model="selectedParticipantId"
          class="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option :value="null">— Выберите участника —</option>
          <option v-for="p in participants" :key="p.id" :value="p.id">
            {{ p.full_name }}
          </option>
        </select>
        <Button
          v-if="selectedParticipantId"
          size="sm"
          variant="outline"
          @click="handleExportParticipant"
        >
          <IconFileDownload class="h-4 w-4" />
          Экспорт участника
        </Button>
      </div>

      <!-- Participant Statistics -->
      <template v-if="participantStats">
        <div class="grid gap-4 md:grid-cols-2">
          <!-- Summary card -->
          <Card>
            <CardHeader class="pb-3">
              <CardTitle class="flex items-center gap-2 text-base">
                <IconUser class="h-5 w-5" />
                {{ participantStats.full_name }}
              </CardTitle>
            </CardHeader>
            <CardContent class="space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-muted-foreground">Команда</span>
                <span class="font-medium">{{
                  participantStats.team_name
                }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-muted-foreground">Пол</span>
                <span class="font-medium">{{
                  genderLabel(participantStats.gender)
                }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-muted-foreground">Возраст</span>
                <span class="font-medium">{{ participantStats.age }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-muted-foreground">Сумма штрафных</span>
                <span class="font-bold">{{
                  participantStats.total_penalties
                }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-muted-foreground">Общее время</span>
                <span class="font-medium font-mono">{{
                  formatTimeLocal(participantStats.total_time)
                }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-muted-foreground">Среднее время</span>
                <span class="font-medium font-mono">{{
                  formatTimeLocal(participantStats.avg_time)
                }}</span>
              </div>
              <div
                v-if="participantStats.best_stage"
                class="flex justify-between text-sm"
              >
                <span class="text-muted-foreground">Лучший этап</span>
                <span class="font-medium text-green-600">
                  {{ participantStats.best_stage }}
                </span>
              </div>
              <div
                v-if="participantStats.worst_stage"
                class="flex justify-between text-sm"
              >
                <span class="text-muted-foreground">Худший этап</span>
                <span class="font-medium text-red-600">
                  {{ participantStats.worst_stage }}
                </span>
              </div>
            </CardContent>
          </Card>

          <!-- Ranks card -->
          <Card>
            <CardHeader class="pb-3">
              <CardTitle class="text-base">Рейтинги</CardTitle>
            </CardHeader>
            <CardContent class="space-y-3">
              <div
                v-if="participantStats.overall_rank > 0"
                class="flex items-center justify-between rounded-lg border p-3"
              >
                <div class="flex items-center gap-2">
                  <IconTrophy class="h-5 w-5 text-yellow-600" />
                  <span class="text-sm"
                    >Место в турнирной таблице ({{
                      genderLabel(participantStats.gender)
                    }})</span
                  >
                </div>
                <span class="text-2xl font-bold text-primary">
                  {{ participantStats.overall_rank }}
                </span>
              </div>
              <div
                v-if="participantStats.team_rank > 0"
                class="flex items-center justify-between rounded-lg border p-3"
              >
                <div class="flex items-center gap-2">
                  <IconUsers class="h-5 w-5 text-muted-foreground" />
                  <span class="text-sm">Место в команде</span>
                </div>
                <span class="text-2xl font-bold text-primary">
                  {{ participantStats.team_rank }}
                </span>
              </div>
              <div
                v-if="
                  participantStats.overall_rank === 0 &&
                  participantStats.team_rank === 0
                "
                class="text-center text-muted-foreground py-4 text-sm"
              >
                Нет результатов
              </div>
            </CardContent>
          </Card>
        </div>

        <!-- Stage results table -->
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-base">Результаты по этапам</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Этап</TableHead>
                  <TableHead class="text-center">
                    <div class="flex items-center justify-center gap-1">
                      <IconAlertTriangle class="h-3.5 w-3.5" />
                      Штрафы
                    </div>
                  </TableHead>
                  <TableHead class="text-center">
                    <div class="flex items-center justify-center gap-1">
                      <IconClock class="h-3.5 w-3.5" />
                      Время
                    </div>
                  </TableHead>
                  <TableHead class="text-center">Место</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="sr in participantStats.stage_results"
                  :key="sr.stage_id"
                >
                  <TableCell class="font-medium">{{ sr.stage_name }}</TableCell>
                  <TableCell class="text-center">{{
                    sr.penalty_points
                  }}</TableCell>
                  <TableCell class="text-center font-mono">{{
                    formatTimeLocal(sr.time_seconds)
                  }}</TableCell>
                  <TableCell class="text-center">
                    <span
                      v-if="sr.stage_rank > 0"
                      :class="[
                        'inline-flex items-center gap-1 font-bold',
                        sr.stage_rank <= 3
                          ? medalColors[sr.stage_rank - 1]
                          : '',
                      ]"
                    >
                      <IconTrophy
                        v-if="sr.stage_rank <= 3"
                        class="h-3.5 w-3.5"
                      />
                      {{ sr.stage_rank }}
                    </span>
                    <span v-else class="text-muted-foreground">—</span>
                  </TableCell>
                </TableRow>
                <TableRow v-if="participantStats.stage_results.length === 0">
                  <TableCell
                    colspan="4"
                    class="text-center text-muted-foreground py-4"
                  >
                    Нет данных
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </template>

      <!-- Per-stage participant breakdown -->
      <div v-if="teamStats && !selectedParticipantId" class="space-y-4">
        <h3
          class="text-sm font-semibold text-muted-foreground uppercase tracking-wide"
        >
          Результаты участников по этапам
        </h3>
        <Card v-for="stage in teamStats.stage_results" :key="stage.stage_id">
          <CardHeader class="pb-3">
            <CardTitle class="flex items-center justify-between text-base">
              <span>{{ stage.stage_name }}</span>
              <span class="text-sm font-normal text-muted-foreground">
                Итого: {{ stage.total_penalties }} шк. ·
                {{ formatTimeLocal(stage.total_time) }}
                <span v-if="stage.stage_rank > 0" class="ml-2">
                  · Место {{ stage.stage_rank }}
                </span>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ФИО</TableHead>
                  <TableHead class="text-center">Пол</TableHead>
                  <TableHead class="text-center">Штрафы</TableHead>
                  <TableHead class="text-center">Время</TableHead>
                  <TableHead class="text-center">Место</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="p in teamStats.participants"
                  :key="p.participant_id"
                  class="cursor-pointer hover:bg-muted/50"
                  @click="selectedParticipantId = p.participant_id"
                >
                  <TableCell class="font-medium">{{ p.full_name }}</TableCell>
                  <TableCell class="text-center text-sm">{{
                    genderLabel(p.gender)
                  }}</TableCell>
                  <template v-for="sr in p.stage_results" :key="sr.stage_id">
                    <template v-if="sr.stage_id === stage.stage_id">
                      <TableCell class="text-center">{{
                        sr.penalty_points
                      }}</TableCell>
                      <TableCell class="text-center font-mono">{{
                        formatTimeLocal(sr.time_seconds)
                      }}</TableCell>
                      <TableCell class="text-center">
                        <span
                          v-if="sr.stage_rank > 0"
                          :class="[
                            'inline-flex items-center gap-1 font-bold',
                            sr.stage_rank <= 3
                              ? medalColors[sr.stage_rank - 1]
                              : '',
                          ]"
                        >
                          <IconTrophy
                            v-if="sr.stage_rank <= 3"
                            class="h-3.5 w-3.5"
                          />
                          {{ sr.stage_rank }}
                        </span>
                        <span v-else class="text-muted-foreground">—</span>
                      </TableCell>
                    </template>
                  </template>
                </TableRow>
                <TableRow v-if="teamStats.participants.length === 0">
                  <TableCell
                    colspan="5"
                    class="text-center text-muted-foreground py-4"
                  >
                    Нет участников
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <!-- Team participants table -->
      <Card v-if="teamStats && !selectedParticipantId">
        <CardHeader class="pb-3">
          <CardTitle class="text-base">Участники команды — сводка</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ФИО</TableHead>
                <TableHead class="text-center">Пол</TableHead>
                <TableHead class="text-center">Штрафы</TableHead>
                <TableHead class="text-center">Время</TableHead>
                <TableHead class="text-center">Место в команде</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="p in teamStats.participants"
                :key="p.participant_id"
                class="cursor-pointer hover:bg-muted/50"
                @click="selectedParticipantId = p.participant_id"
              >
                <TableCell class="font-medium">{{ p.full_name }}</TableCell>
                <TableCell class="text-center text-sm">{{
                  genderLabel(p.gender)
                }}</TableCell>
                <TableCell class="text-center">{{
                  p.total_penalties
                }}</TableCell>
                <TableCell class="text-center font-mono">{{
                  formatTimeLocal(p.total_time)
                }}</TableCell>
                <TableCell class="text-center">
                  <span
                    v-if="p.team_rank > 0"
                    :class="[
                      'inline-flex items-center gap-1 font-bold',
                      p.team_rank <= 3 ? medalColors[p.team_rank - 1] : '',
                    ]"
                  >
                    <IconTrophy v-if="p.team_rank <= 3" class="h-3.5 w-3.5" />
                    {{ p.team_rank }}
                  </span>
                  <span v-else class="text-muted-foreground">—</span>
                </TableCell>
              </TableRow>
              <TableRow v-if="teamStats.participants.length === 0">
                <TableCell
                  colspan="5"
                  class="text-center text-muted-foreground py-4"
                >
                  Нет участников
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
