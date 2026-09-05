<script lang="ts" setup>
import { ref, watch, onMounted, computed } from "vue";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconClipboardList,
  IconClock,
  IconDeviceFloppy,
} from "@tabler/icons-vue";
import { toast } from "vue-sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStages, useResults, useFormat } from "@/composables/useApi";
const props = defineProps<{ competitionId: number }>();

const { stages, load: loadStages } = useStages();
const { getParticipantsWithResults, upsert } = useResults();
const { formatTimeLocal } = useFormat();

const selectedStageId = ref<number | null>(null);
const participants = ref<any[]>([]);
const resultsMap = ref<
  Record<number, { time: string; penalties: number; correctAnswers: number }>
>({});

onMounted(async () => {
  await loadStages(props.competitionId);
  if (stages.value.length > 0) {
    selectedStageId.value = stages.value[0].id;
    await loadResults();
  }
});

watch(
  () => props.competitionId,
  async () => {
    await loadStages(props.competitionId);
    if (stages.value.length > 0) {
      selectedStageId.value = stages.value[0].id;
      await loadResults();
    }
  },
);

async function loadResults() {
  if (!selectedStageId.value) return;
  const result = await getParticipantsWithResults(
    props.competitionId,
    selectedStageId.value,
  );
  if (result) {
    participants.value = result;
    resultsMap.value = {};
    for (const p of result) {
      resultsMap.value[p.id] = {
        time: p.time_seconds > 0 ? formatTimeLocal(p.time_seconds) : "",
        penalties: p.penalty_points,
        correctAnswers: p.correct_answers || 0,
      };
    }
  }
}

async function selectStage(stageId: number) {
  selectedStageId.value = stageId;
  await loadResults();
}

const groupedByTeam = computed(() => {
  const groups: Record<string, any[]> = {};
  for (const p of participants.value) {
    if (!groups[p.team_name]) groups[p.team_name] = [];
    groups[p.team_name].push(p);
  }
  return groups;
});

async function saveResult(participantId: number) {
  if (!selectedStageId.value) return;
  const r = resultsMap.value[participantId];
  if (!r) return;

  const timeSeconds = r.time ? parseTimeString(r.time) : 0;
  const result = await upsert(
    selectedStageId.value,
    participantId,
    timeSeconds,
    r.penalties || 0,
    r.correctAnswers || 0,
  );
  if (result !== null) {
    const p = participants.value.find((x) => x.id === participantId);
    toast.success("Результат сохранён", {
      description: p?.full_name ?? undefined,
    });
  }
}

function parseTimeString(time: string): number {
  const parts = time.split(":");
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseFloat(parts[1]);
  }
  return parseFloat(time) || 0;
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
          class="mb-3"
        >
          <CardHeader class="py-3">
            <CardTitle class="text-sm">{{ teamName }}</CardTitle>
          </CardHeader>
          <CardContent class="pt-0">
            <div class="space-y-2">
              <!-- Column headers -->
              <div
                class="grid grid-cols-[1fr_6rem_4.5rem_4.5rem_auto] items-center gap-2 px-2 text-xs text-muted-foreground"
              >
                <span>Участник</span>
                <span class="flex items-center justify-center gap-1">
                  <IconClock class="h-3.5 w-3.5 text-sky-500" />
                  Время
                </span>
                <span class="flex items-center justify-center gap-1">
                  <IconCircleCheck class="h-3.5 w-3.5 text-green-500" />
                  Ответы
                </span>
                <span class="flex items-center justify-center gap-1">
                  <IconAlertTriangle class="h-3.5 w-3.5 text-amber-500" />
                  Штраф
                </span>
                <span></span>
              </div>
              <div
                v-for="p in teamParticipants"
                :key="p.id"
                class="grid grid-cols-[1fr_6rem_4.5rem_4.5rem_auto] items-center gap-2 rounded-md border p-2"
              >
                <span class="truncate text-sm font-medium">{{
                  p.full_name
                }}</span>
                <Input
                  v-model="resultsMap[p.id].time"
                  placeholder="MM:SS"
                  class="text-center"
                  title="Время прохождения (MM:SS)"
                />
                <Input
                  v-model.number="resultsMap[p.id].correctAnswers"
                  type="number"
                  placeholder="0"
                  class="text-center"
                  title="Правильные ответы"
                />
                <Input
                  v-model.number="resultsMap[p.id].penalties"
                  type="number"
                  placeholder="0"
                  class="text-center"
                  title="Штрафные баллы"
                />
                <Button
                  size="sm"
                  title="Сохранить результат"
                  @click="saveResult(p.id)"
                >
                  <IconDeviceFloppy class="h-4 w-4" />
                  Сохранить
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>
