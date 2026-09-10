<script lang="ts" setup>
import { ref, watch, onMounted, computed } from "vue";
import { useDebounceFn } from "@vueuse/core";
import {
  IconAlertTriangle,
  IconChevronDown,
  IconClipboardList,
  IconClock,
  IconUser,
} from "@tabler/icons-vue";
import { toast } from "@/composables/useToast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStages, useResults } from "@/composables/useApi";
import { useAppState } from "@/composables/useAppState";
import { TimePicker } from "@/components/ui/time-picker";
const props = defineProps<{ competitionId: number }>();

const { stages, load: loadStages } = useStages();
const { getParticipantsWithResults, upsert } = useResults();
const { state } = useAppState();

const selectedStageId = ref<number | null>(null);
const participants = ref<any[]>([]);
const resultsMap = ref<
  Record<number, { time: number | null; penalties: number | null }>
>({});
const expandedTeams = ref<Set<string>>(new Set());

const dirtyIds = new Set<number>();
const debouncedSave = useDebounceFn(async () => {
  const ids = Array.from(dirtyIds);
  dirtyIds.clear();
  await Promise.all(ids.map((id) => saveResult(id)));
}, 400);

function queueSave(participantId: number) {
  dirtyIds.add(participantId);
  debouncedSave();
}

function restoreSelectedStage() {
  if (stages.value.length === 0) {
    selectedStageId.value = null;
    return;
  }

  const saved = state.results?.[props.competitionId]?.selectedStageId;
  if (saved != null && stages.value.some((s) => s.id === saved)) {
    selectedStageId.value = saved;
  } else {
    selectedStageId.value = stages.value[0].id;
  }
}

async function initialize() {
  expandedTeams.value = new Set();
  await loadStages(props.competitionId);
  restoreSelectedStage();
  if (selectedStageId.value != null) {
    await loadResults();
  }
}

onMounted(initialize);

watch(() => props.competitionId, initialize);

async function loadResults() {
  if (!selectedStageId.value) return;
  debouncedSave.cancel();
  dirtyIds.clear();
  const result = await getParticipantsWithResults(
    props.competitionId,
    selectedStageId.value,
  );
  if (result) {
    participants.value = result;
    resultsMap.value = {};
    for (const p of result) {
      resultsMap.value[p.id] = {
        time: p.time_seconds > 0 ? p.time_seconds : null,
        penalties: p.penalty_points,
      };
    }
    resetExpandedTeams();
  }
}

async function selectStage(stageId: number) {
  selectedStageId.value = stageId;
  await loadResults();
}

watch(selectedStageId, (id) => {
  if (!state.results) state.results = {};
  const current = state.results[props.competitionId] ?? {};
  state.results[props.competitionId] = { ...current, selectedStageId: id };
});

const groupedByTeam = computed(() => {
  const groups: Record<string, any[]> = {};
  for (const p of participants.value) {
    if (!groups[p.team_name]) groups[p.team_name] = [];
    groups[p.team_name].push(p);
  }
  return groups;
});

function resetExpandedTeams() {
  expandedTeams.value = new Set();
}

function toggleTeam(teamName: string) {
  const next = new Set(expandedTeams.value);
  if (next.has(teamName)) {
    next.delete(teamName);
  } else {
    next.add(teamName);
  }
  expandedTeams.value = next;
}

function onTimeChange(participantId: number, value: number | null) {
  const r = resultsMap.value[participantId];
  if (!r) return;
  r.time = value;
  queueSave(participantId);
}

async function saveResult(participantId: number) {
  if (!selectedStageId.value) return;
  const r = resultsMap.value[participantId];
  if (!r) return;

  const timeSeconds = r.time ?? 0;
  const result = await upsert(
    selectedStageId.value,
    participantId,
    timeSeconds,
    r.penalties || 0,
  );
  if (result !== null) {
    const p = participants.value.find((x) => x.id === participantId);
    toast.success("Результат сохранён", {
      description: p?.full_name ?? undefined,
    });
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">Ввод результатов</h2>
    </div>

    <div
      v-if="stages.length === 0"
      class="text-center py-12 text-muted-foreground"
    >
      <IconClipboardList class="mx-auto mb-3 h-12 w-12" />
      <p>Сначала создайте этапы</p>
    </div>

    <div v-else class="space-y-4">
      <!-- Stage selector -->
      <div class="flex gap-2 flex-wrap">
        <Button
          v-for="stage in stages"
          :key="stage.id"
          :variant="selectedStageId === stage.id ? 'default' : 'outline'"
          size="sm"
          @click="selectStage(stage.id)"
        >
          {{ stage.name }}
        </Button>
      </div>

      <!-- Results by team -->
      <div v-if="selectedStageId">
        <div
          v-if="Object.keys(groupedByTeam).length === 0"
          class="text-center py-8 text-muted-foreground"
        >
          <p>Нет участников. Добавьте команды и участников.</p>
        </div>
        <Card
          v-for="(teamParticipants, teamName) in groupedByTeam"
          :key="teamName"
          class="mb-3 transition-all duration-200 hover:shadow-md hover:border-primary/50"
        >
          <CardHeader
            class="flex h-15 flex-row items-center justify-between overflow-hidden py-3 cursor-pointer"
            @click="toggleTeam(teamName)"
          >
            <div class="flex min-w-0 items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                class="h-8 w-8 shrink-0 px-0"
                :title="expandedTeams.has(teamName) ? 'Свернуть' : 'Развернуть'"
                :aria-expanded="expandedTeams.has(teamName)"
                @click.stop="toggleTeam(teamName)"
              >
                <IconChevronDown
                  class="h-4 w-4 transition-transform duration-200"
                  :class="{ 'rotate-180': expandedTeams.has(teamName) }"
                />
              </Button>
              <CardTitle class="text-sm truncate">{{ teamName }}</CardTitle>
            </div>
          </CardHeader>
          <CardContent v-if="expandedTeams.has(teamName)" class="pt-0">
            <div class="space-y-2">
              <!-- Column headers -->
              <div
                class="grid grid-cols-[1fr_6rem_4.5rem] items-center gap-2 px-2 text-xs text-muted-foreground"
              >
                <span class="flex items-center gap-1">
                  <IconUser class="h-3.5 w-3.5 text-muted-foreground" />
                  Участник
                </span>
                <span class="flex items-center justify-center gap-1">
                  <IconClock class="h-3.5 w-3.5 text-muted-foreground" />
                  Время
                </span>
                <span class="flex items-center justify-center gap-1">
                  <IconAlertTriangle
                    class="h-3.5 w-3.5 text-muted-foreground"
                  />
                  Штраф
                </span>
              </div>
              <div
                v-for="p in teamParticipants"
                :key="p.id"
                class="grid grid-cols-[1fr_6rem_4.5rem] items-center gap-2 rounded-md border bg-muted p-2"
              >
                <div class="flex min-w-0 items-center gap-2">
                  <IconUser class="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span class="truncate text-sm font-medium">{{
                    p.full_name
                  }}</span>
                </div>
                <TimePicker
                  :model-value="resultsMap[p.id].time"
                  class="bg-background text-center"
                  @update:model-value="(v) => onTimeChange(p.id, v)"
                />
                <Input
                  v-model="resultsMap[p.id].penalties"
                  type="number"
                  placeholder="0"
                  class="bg-background text-center"
                  title="Штрафные баллы"
                  @update:model-value="queueSave(p.id)"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>
